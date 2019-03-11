use std::collections::HashSet;

use actix_web::{AsyncResponder, Json, State};
use futures::future::result;
use futures::future::Future;
use serde_derive::Serialize;

use crate::models::*;
use crate::web::db::*;
use crate::web::endpoints::AsyncJsonResponse;

#[derive(Serialize)]
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
