use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use actix::{Handler, Message};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::BelongingToDsl;
use diesel::Connection;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};
use fs_extra::dir::CopyOptions;
use serde_derive::Serialize;
use tempfile::TempDir;

use crate::create_submission_dir;
use crate::models::*;
use crate::task_maker_ui::SubtaskNum;
use crate::task_maker_ui::TestcaseNum;

use super::Executor;

pub struct GetSubmissions {
    pub participation_id: i32,
    pub task_id: i32,
}

pub struct GetSubmission {
    pub submission_id: i32,
}

pub struct Submit {
    pub task_id: i32,
    pub participation_id: i32,
    pub files: Vec<PathBuf>,
    pub tempdir: Arc<TempDir>,
}

#[derive(Serialize)]
pub struct GetSubmissionResultTestcase {
    pub running_time: f64,
    pub memory_usage: i32,
    pub message: String,
    pub score: f64,
}

#[derive(Serialize)]
pub struct GetSubmissionResultSubtask {
    pub score: f64,
    pub testcases: HashMap<TestcaseNum, GetSubmissionResultTestcase>,
}

#[derive(Serialize)]
pub struct GetSubmissionResult {
    pub submission: Submission,
    pub results: HashMap<SubtaskNum, GetSubmissionResultSubtask>,
}

impl Message for GetSubmissions {
    type Result = Result<Vec<Submission>, Error>;
}

impl Handler<GetSubmissions> for Executor {
    type Result = Result<Vec<Submission>, Error>;

    fn handle(
        &mut self,
        msg: GetSubmissions,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::submissions::dsl::*;

        let subs = submissions
            .filter(participation_id.eq(&msg.participation_id))
            .filter(task_id.eq(&msg.task_id))
            .load::<Submission>(&self.0);
        match subs {
            Ok(subs) => Ok(subs),
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}

impl Message for GetSubmission {
    type Result = Result<GetSubmissionResult, Error>;
}

impl Handler<GetSubmission> for Executor {
    type Result = Result<GetSubmissionResult, Error>;

    fn handle(
        &mut self,
        msg: GetSubmission,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::submissions::dsl::*;

        let sub = submissions
            .find(&msg.submission_id)
            .first::<Submission>(&self.0);
        let sub = match sub {
            Ok(sub) => sub,
            Err(diesel::result::Error::NotFound) => {
                return Err(ErrorNotFound(format!("No such submission")))
            }
            Err(err) => return Err(ErrorInternalServerError(err)),
        };
        let (subtask_results, subtasks): (Vec<SubtaskResult>, Vec<Subtask>) =
            SubtaskResult::belonging_to(&sub)
                .inner_join(crate::schema::subtasks::dsl::subtasks)
                .load::<(SubtaskResult, Subtask)>(&self.0)
                .map_err(|e| ErrorInternalServerError(e))?
                .into_iter()
                .unzip();
        let subtasks: HashMap<i32, i32> =
            subtasks.iter().map(|st| (st.id, st.num)).collect();
        let testcase_results = TestcaseResult::belonging_to(&subtask_results)
            .load::<TestcaseResult>(&self.0)
            .map_err(|e| ErrorInternalServerError(e))?;
        let subtask_id: HashMap<i32, i32> = subtask_results
            .iter()
            .map(|s| (s.id, s.subtask_id))
            .collect();

        let mut result = GetSubmissionResult {
            submission: sub,
            results: subtask_results
                .into_iter()
                .map(|s| {
                    (
                        *subtasks.get(&s.subtask_id).expect("unknown subtask"),
                        GetSubmissionResultSubtask {
                            score: s.score,
                            testcases: HashMap::new(),
                        },
                    )
                })
                .collect(),
        };
        for testcase in testcase_results {
            result
                .results
                .get_mut(
                    &subtasks
                        .get(
                            &subtask_id
                                .get(&testcase.subtask_result_id)
                                .expect("unknown subtask result of testcase"),
                        )
                        .expect("unknown subtask of testcase"),
                )
                .expect("unknown subtask of testcase result")
                .testcases
                .insert(
                    testcase.num,
                    GetSubmissionResultTestcase {
                        message: testcase.message,
                        score: testcase.score,
                        running_time: testcase.running_time,
                        memory_usage: testcase.memory_usage,
                    },
                );
        }

        Ok(result)
    }
}

impl Message for Submit {
    type Result = Result<Submission, Error>;
}

impl Handler<Submit> for Executor {
    type Result = Result<Submission, Error>;

    fn handle(&mut self, msg: Submit, _: &mut Self::Context) -> Self::Result {
        use crate::schema::submissions::dsl::*;

        (&self.0)
            .transaction(|| -> Result<Submission, failure::Error> {
                let new_sub = NewSubmission {
                    task_id: msg.task_id,
                    participation_id: msg.participation_id,
                    files: msg
                        .files
                        .iter()
                        .map(|p| {
                            p.file_name()
                                .and_then(|s| s.to_str())
                                .map(|s| s.to_string())
                                .unwrap_or(format!(""))
                        })
                        .collect(),
                };
                let info = diesel::insert_into(submissions)
                    .values(&new_sub)
                    .get_result::<Submission>(&self.0)?;
                let dest_path = create_submission_dir(info.id);
                fs_extra::move_items(
                    &msg.files,
                    dest_path,
                    &CopyOptions::new(),
                )?;
                Ok(info)
            })
            .map_err(ErrorInternalServerError)
    }
}
