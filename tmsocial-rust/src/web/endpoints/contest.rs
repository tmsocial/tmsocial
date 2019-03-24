use std::collections::HashSet;
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;

use actix_web::error::ErrorNotFound;
use actix_web::error::{
    ErrorBadRequest, ErrorInternalServerError, MultipartError, PayloadError,
};
use actix_web::fs::NamedFile;
use actix_web::{
    dev, multipart, AsyncResponder, Error, FromRequest, HttpMessage,
    HttpRequest, Json, State,
};
use futures::future;
use futures::future::{result, Future};
use futures::stream::Stream;
use serde_derive::{Deserialize, Serialize};
use tempfile::TempDir;

use crate::models::*;
use crate::web::db::*;
use crate::web::endpoints::{
    get_accept_languages, get_path_tail, match_file, AsyncJsonResponse,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct GetContestsResponseItem {
    pub contest: Contest,
    pub participating: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetContestResponse {
    pub contest: Contest,
    pub tasks: Option<Vec<Task>>,
}

pub fn get_contests(
    state: State<crate::web::State>,
    site: Site,
    user: Option<User>,
) -> AsyncJsonResponse<Vec<GetContestsResponseItem>> {
    let contests = state.db.send(GetContests { site_id: site.id });
    let participations = state.db.send(GetParticipationsByUser {
        // assuming no user has negative id
        user_id: user.map(|user| user.id).unwrap_or(-1),
    });
    let res = contests.join(participations).from_err().map(
        |(contests, participations)| match (contests, participations) {
            (Ok(contests), Ok(participations)) => {
                let participations: HashSet<i32> =
                    participations.iter().map(|p| p.contest_id).collect();
                Ok(contests
                    .into_iter()
                    .map(|c| GetContestsResponseItem {
                        participating: participations.contains(&c.id),
                        contest: c,
                    })
                    .collect())
            }
            (Err(err), _) => Err(err),
            (_, Err(err)) => Err(err),
        },
    );
    Box::new(res.and_then(|r| result(r.map(|r| Json(r))).responder()))
}

pub fn get_contest(
    state: State<crate::web::State>,
    contest: Contest,
    participation: Option<Participation>,
) -> AsyncJsonResponse<GetContestResponse> {
    match participation {
        Some(_) => Box::new(
            state
                .db
                .send(GetTaskByContest {
                    contest_id: contest.id,
                })
                .from_err()
                .and_then(|res| {
                    result(res.map(|tasks| {
                        Json(GetContestResponse {
                            contest,
                            tasks: Some(tasks),
                        })
                    }))
                    .responder()
                }),
        ),
        None => Box::new(
            result(Ok(Json(GetContestResponse {
                contest,
                tasks: None,
            })))
            .responder(),
        ),
    }
}

pub fn join_contest(
    state: State<crate::web::State>,
    contest: Contest,
    user: User,
) -> AsyncJsonResponse<()> {
    Box::new(
        state
            .db
            .send(JoinContest {
                contest_id: contest.id,
                user_id: user.id,
            })
            .from_err()
            .and_then(|res| result(res.map(|u| Json(u))).responder()),
    )
}

pub fn get_task(
    task: Task,
    _participation: Participation,
) -> AsyncJsonResponse<Task> {
    Box::new(futures::future::done(Ok(Json(task))))
}

pub fn get_submissions(
    state: State<crate::web::State>,
    participation: Participation,
    task: Task,
) -> AsyncJsonResponse<Vec<Submission>> {
    Box::new(
        state
            .db
            .send(GetSubmissions {
                participation_id: participation.id,
                task_id: task.id,
            })
            .from_err()
            .and_then(|res| result(res.map(|u| Json(u))).responder()),
    )
}

pub fn get_submission(
    submission: GetSubmissionResult,
) -> AsyncJsonResponse<GetSubmissionResult> {
    Box::new(future::done(Ok(Json(submission))))
}

pub fn submit(
    state: State<crate::web::State>,
    participation: Participation,
    task: Task,
    req: HttpRequest<crate::web::State>,
) -> AsyncJsonResponse<Submission> {
    let tempdir = TempDir::new();
    if tempdir.is_err() {
        return Box::new(future::err(ErrorInternalServerError(
            tempdir.err().unwrap(),
        )));
    }
    let tempdir = Arc::new(tempdir.unwrap());
    let tempdir2 = tempdir.clone();
    let user_id = participation.user_id;
    let event_manager = state.event_manager.clone().recipient();
    let evaluator = state.evaluator.clone();
    let db = state.db.clone();
    Box::new(
        req.multipart()
            .map_err(ErrorInternalServerError)
            .map(move |item| handle_multipart_item(tempdir.clone(), item))
            .flatten()
            .collect()
            .and_then(move |files| {
                db.send(Submit {
                    task_id: task.id,
                    participation_id: participation.id,
                    files: files,
                    tempdir: tempdir2,
                })
                .from_err()
            })
            .and_then(|sub| sub)
            .and_then(move |sub| {
                evaluator.do_send(crate::evaluation::Evaluate {
                    submission: sub.clone(),
                    user_id: user_id,
                    notify: event_manager,
                });
                Ok(sub)
            })
            .and_then(|sub| result(Ok(Json(sub)))),
    )
}

fn handle_multipart_item(
    temp: Arc<TempDir>,
    item: multipart::MultipartItem<dev::Payload>,
) -> Box<Stream<Item = PathBuf, Error = Error>> {
    match item {
        multipart::MultipartItem::Field(field) => {
            let filename = field
                .content_disposition()
                .map(|f| f.get_filename().map(|f| f.to_string()));
            let filename = match filename {
                Some(Some(filename)) => filename,
                _ => {
                    return Box::new(
                        future::err(ErrorBadRequest("Missing file name"))
                            .into_stream(),
                    )
                }
            };
            Box::new(save_file(field, temp.clone(), filename).into_stream())
        }
        multipart::MultipartItem::Nested(mp) => Box::new(
            mp.map_err(ErrorInternalServerError)
                .map(move |item| handle_multipart_item(temp.clone(), item))
                .flatten(),
        ),
    }
}

fn save_file(
    field: multipart::Field<dev::Payload>,
    temp: Arc<TempDir>,
    filename: String,
) -> Box<Future<Item = PathBuf, Error = Error>> {
    let filename = temp.path().join(std::path::Path::new(&filename));
    let mut file = match fs::File::create(&filename) {
        Ok(file) => file,
        Err(e) => return Box::new(future::err(ErrorInternalServerError(e))),
    };
    Box::new(
        field
            .fold((), move |_, bytes| {
                future::result(
                    file.write_all(bytes.as_ref()).map_err(|e| {
                        MultipartError::Payload(PayloadError::Io(e))
                    }),
                )
            })
            .map(move |_| filename)
            .map_err(ErrorInternalServerError),
    )
}

pub fn handle_contest_assets(
    req: &HttpRequest<crate::web::State>,
) -> Box<Future<Item = NamedFile, Error = Error>> {
    // TODO test if this works inter-site
    let contest = Contest::extract(req);
    let path = match get_path_tail(req) {
        Ok(path) => path,
        Err(e) => return Box::new(future::err(e)),
    };
    let languages = get_accept_languages(req);
    Box::new(contest.and_then(move |contest| {
        let storage_dir = PathBuf::new().join(Path::new(
            &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
        ));
        let path = storage_dir
            .join(Path::new("contests"))
            .join(Path::new(&contest.id.to_string()))
            .join(&path);
        match match_file(path, &languages) {
            Some(path) => Ok(NamedFile::open(path)
                .map_err(|_e| ErrorNotFound("No such asset"))?),
            _ => Err(ErrorNotFound("No such asset")),
        }
    }))
}

pub fn handle_task_assets(
    req: &HttpRequest<crate::web::State>,
) -> Box<Future<Item = NamedFile, Error = Error>> {
    // TODO test if this works inter-contest
    let task = Task::extract(req);
    let path = match get_path_tail(req) {
        Ok(path) => path,
        Err(e) => return Box::new(future::err(e)),
    };
    let languages = get_accept_languages(req);
    Box::new(task.and_then(move |task| {
        let storage_dir = PathBuf::new().join(Path::new(
            &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
        ));
        let path = storage_dir
            .join(Path::new("tasks"))
            .join(Path::new(&task.id.to_string()))
            .join(Path::new("assets"))
            .join(&path);
        match match_file(path, &languages) {
            Some(path) => Ok(NamedFile::open(path)
                .map_err(|_e| ErrorNotFound("No such asset"))?),
            _ => Err(ErrorNotFound("No such asset")),
        }
    }))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use actix_web::http::{Method, StatusCode};
    use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

    use crate::test_utils::*;
    use crate::web::db::submission::GetSubmissionResult;
    use crate::web::test_utils::*;
    use crate::web::ErrorResponse;

    use super::*;

    /// Number that should not be a valid id ever.
    const FAKE_ID: i32 = 10000000;

    #[test]
    fn get_contests() {
        let site = FakeSite::new();
        let other_site = FakeSite::new();
        let mut contests: HashMap<i32, Contest> =
            vec![site.contest("contest_a"), site.contest("contest_b")]
                .into_iter()
                .map(|c| (c.id, c))
                .collect();
        other_site.contest("nothing to see here");
        let res: Vec<GetContestsResponseItem> =
            TestRequestBuilder::new(&site, "/api/contests").finish();
        for contest in res {
            assert_eq!(
                contest.contest.name,
                contests.get(&contest.contest.id).expect("wrong data").name
            );
            assert_eq!(false, contest.participating);
            contests.remove(&contest.contest.id);
        }
        assert!(contests.is_empty());
    }

    #[test]
    fn get_contests_auth() {
        let site = FakeSite::new();
        let contests: HashMap<i32, Contest> =
            vec![site.contest("contest_a"), site.contest("contest_b")]
                .into_iter()
                .map(|c| (c.id, c))
                .collect();
        let user = site.user("user");
        let part = site.participation(contests.values().next().unwrap(), &user);
        let res: Vec<GetContestsResponseItem> =
            TestRequestBuilder::new(&site, "/api/contests")
                .auth(&user)
                .finish();
        for contest in res {
            assert_eq!(
                contest.contest.name,
                contests.get(&contest.contest.id).expect("wrong data").name
            );
            assert_eq!(
                part.contest_id == contest.contest.id,
                contest.participating
            );
        }
    }

    #[test]
    fn get_contest() {
        let site = FakeSite::new();
        let contest = site.contest("contest");
        let res: GetContestResponse = TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}", contest.id),
        )
        .finish();
        assert_eq!(res.contest.id, contest.id);
        assert_eq!(res.contest.name, contest.name);
        assert!(res.tasks.is_none());
    }

    #[test]
    fn get_contest_with_part() {
        let site = FakeSite::new();
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        let user = site.user("username");
        site.participation(&contest, &user);
        let res: GetContestResponse = TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}", contest.id),
        )
        .auth(&user)
        .finish();
        assert_eq!(res.contest.id, contest.id);
        assert_eq!(res.contest.name, contest.name);
        let res_task = &res.tasks.expect("Tasks were not sent")[0];
        assert_eq!(res_task.id, task.id);
        assert_eq!(res_task.name, task.name);
    }

    #[test]
    fn get_contest_not_found() {
        let site = FakeSite::new();
        let res: ErrorResponse = TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}", FAKE_ID),
        )
        .status(StatusCode::NOT_FOUND)
        .finish();
        assert_eq!(res.error, "No such contest");
    }

    // TODO get_contest_wrong_site()

    #[test]
    fn join_contest() {
        use crate::schema::participations::dsl::*;
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/join", contest.id),
        )
        .auth(&user)
        .method(Method::POST)
        .finish::<()>();

        let part = participations
            .filter(user_id.eq(user.id))
            .filter(contest_id.eq(contest.id))
            .first::<Participation>(&site.conn)
            .expect("No participation created");
        assert_eq!(part.user_id, user.id);
        assert_eq!(part.contest_id, contest.id);
    }

    #[test]
    fn join_contest_no_contest() {
        let site = FakeSite::new();
        let user = site.user("username");
        let error: ErrorResponse = TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/join", FAKE_ID),
        )
        .auth(&user)
        .method(Method::POST)
        .status(StatusCode::NOT_FOUND)
        .finish();
        assert_eq!(error.error, "No such contest");
    }

    #[test]
    fn join_contest_no_user() {
        let site = FakeSite::new();
        let contest = site.contest("contest");
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/join", contest.id),
        )
        .method(Method::POST)
        .status(StatusCode::FORBIDDEN)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn join_contest_already_in() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        site.participation(&contest, &user);
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/join", contest.id),
        )
        .auth(&user)
        .method(Method::POST)
        .status(StatusCode::UNPROCESSABLE_ENTITY)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_task() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        site.participation(&contest, &user);
        let res: Task = TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/task/{}", contest.id, task.id),
        )
        .auth(&user)
        .finish();
        assert_eq!(res.name, task.name);
    }

    #[test]
    fn get_task_no_auth() {
        let site = FakeSite::new();
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/task/{}", contest.id, task.id),
        )
        .status(StatusCode::FORBIDDEN)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_task_no_part() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/task/{}", contest.id, task.id),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_task_not_found() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        site.participation(&contest, &user);
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/task/{}", contest.id, FAKE_ID),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_task_wrong_contest() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        site.participation(&contest, &user);
        let contest2 = site.contest("contest2");
        let task = site.task(&contest2, "task");
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/task/{}", contest.id, task.id),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_task_no_contest() {
        let site = FakeSite::new();
        let user = site.user("username");
        TestRequestBuilder::new(
            &site,
            &format!("/api/contest/{}/task/{}", FAKE_ID, FAKE_ID),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submissions() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        let part = site.participation(&contest, &user);
        let mut submissions: HashMap<i32, Submission> =
            vec![site.submission(&task, &part), site.submission(&task, &part)]
                .into_iter()
                .map(|s| (s.id, s))
                .collect();
        let res: Vec<Submission> = TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submissions",
                contest.id, task.id
            ),
        )
        .auth(&user)
        .finish();
        for sub in res {
            assert!(submissions.contains_key(&sub.id));
            submissions.remove(&sub.id);
        }
        assert!(submissions.is_empty());
    }

    #[test]
    fn get_submissions_no_auth() {
        let site = FakeSite::new();
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submissions",
                contest.id, task.id
            ),
        )
        .status(StatusCode::FORBIDDEN)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submissions_no_part() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submissions",
                contest.id, task.id
            ),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submissions_no_task() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        site.participation(&contest, &user);
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submissions",
                contest.id, FAKE_ID
            ),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submissions_wrong_contest() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let contest2 = site.contest("contest2");
        let task = site.task(&contest2, "task");
        site.participation(&contest, &user);
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submissions",
                contest.id, task.id
            ),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submission() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        let part = site.participation(&contest, &user);
        let sub = site.submission(&task, &part);
        let res: GetSubmissionResult = TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submission/{}",
                contest.id, task.id, sub.id
            ),
        )
        .auth(&user)
        .finish();
        assert_eq!(res.submission.id, sub.id);
    }

    #[test]
    fn get_submission_no_auth() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        let part = site.participation(&contest, &user);
        let sub = site.submission(&task, &part);
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submission/{}",
                contest.id, task.id, sub.id
            ),
        )
        .status(StatusCode::FORBIDDEN)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submission_not_found() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        site.participation(&contest, &user);
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submission/{}",
                contest.id, task.id, FAKE_ID
            ),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submission_wrong_task() {
        let site = FakeSite::new();
        let user = site.user("username");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        let task2 = site.task(&contest, "task2");
        let part = site.participation(&contest, &user);
        let sub = site.submission(&task2, &part);
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submission/{}",
                contest.id, task.id, sub.id
            ),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }

    #[test]
    fn get_submission_wrong_user() {
        let site = FakeSite::new();
        let user = site.user("username");
        let user2 = site.user("username2");
        let contest = site.contest("contest");
        let task = site.task(&contest, "task");
        let part = site.participation(&contest, &user2);
        let sub = site.submission(&task, &part);
        TestRequestBuilder::new(
            &site,
            &format!(
                "/api/contest/{}/task/{}/submission/{}",
                contest.id, task.id, sub.id
            ),
        )
        .auth(&user)
        .status(StatusCode::NOT_FOUND)
        .finish::<ErrorResponse>();
    }
}
