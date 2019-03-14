use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;

use actix_web::dev;
use actix_web::error::{
    ErrorBadRequest, ErrorInternalServerError, MultipartError, PayloadError,
};
use actix_web::multipart;
use actix_web::{AsyncResponder, Error, HttpMessage, HttpRequest, Json, State};
use futures::future;
use futures::future::{result, Future};
use futures::stream::Stream;
use serde_derive::{Deserialize, Serialize};
use tempfile::TempDir;

use crate::models::*;
use crate::web::db::*;
use crate::web::endpoints::AsyncJsonResponse;

#[derive(Debug, Serialize, Deserialize)]
pub struct GetContestsResponseItem {
    pub contest: Contest,
    pub participating: bool,
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

pub fn get_contest(contest: Contest) -> AsyncJsonResponse<Contest> {
    Box::new(result(Ok(Json(contest))).responder())
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
    Box::new(
        req.multipart()
            .map_err(ErrorInternalServerError)
            .map(move |item| handle_multipart_item(tempdir.clone(), item))
            .flatten()
            .collect()
            .map(move |files| {
                state
                    .db
                    .send(Submit {
                        task_id: task.id,
                        participation_id: participation.id,
                        files: files,
                        tempdir: tempdir2,
                    })
                    .from_err()
                    .and_then(|sub| result(sub.and_then(|s| Ok(Json(s)))))
            })
            .and_then(|x| x),
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

#[cfg(test)]
mod tests {
    use super::GetContestsResponseItem;
    use crate::models::*;
    use crate::test_utils::*;
    use crate::web::test_utils::*;
    use std::collections::HashMap;

    #[test]
    fn get_contests() {
        let site = FakeSite::new();
        let contests: HashMap<i32, Contest> =
            vec![site.contest("contest_a"), site.contest("contest_b")]
                .into_iter()
                .map(|c| (c.id, c))
                .collect();
        let res: Vec<GetContestsResponseItem> =
            json_request(&site, "/api/contests");
        for contest in res {
            assert_eq!(
                contest.contest.name,
                contests.get(&contest.contest.id).expect("wrong data").name
            );
            assert_eq!(false, contest.participating);
        }
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
            json_request_auth(&site, "/api/contests", Some(&user));
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
}
