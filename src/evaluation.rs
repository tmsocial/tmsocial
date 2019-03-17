#![allow(proc_macro_derive_resolution_fallback)]

use std::collections::HashMap;
use std::collections::HashSet;
use std::env;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

use actix::prelude::*;
use actix_derive::Message;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use failure::Error;
use futures::future::{join_all, ok, Future};
use itertools::Itertools;
use log::{debug, error, info};
use scopeguard::defer;

use crate::events::{Event, SubmissionUpdate};
use crate::mark_internal_error;
use crate::models::*;
use crate::task_maker_ui::ioi::IOIResult;
use crate::task_maker_ui::terry::TerryResult;
use crate::task_maker_ui::{
    SourceFileCompilationStatus, State, SubtaskNum, TaskMakerMessage,
};

#[derive(Debug, Fail)]
pub enum EvaluationError {
    #[fail(display = "unsupported number of files: {}", number)]
    WrongNumberOfFiles { number: usize },
    #[fail(display = "submission is already being evaluated")]
    AlreadyEvaluating,
}

fn evaluate_submission(
    conn: &PgConnection,
    submission: &Submission,
    notify: &Recipient<SubmissionUpdate>,
    user_id: i32,
) -> Result<f64, Error> {
    let task_maker = env::var("TASK_MAKER").expect("TASK_MAKER must be set");
    let storage_dir = PathBuf::new().join(Path::new(
        &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
    ));
    let submission_dir = storage_dir.join(Path::new("submissions"));
    let task_dir = storage_dir.join(Path::new("tasks"));

    let path = task_dir.join(Path::new(&submission.task_id.to_string()));

    let mut event_count = 0;
    let mut update_status = |status| {
        let err = notify.do_send(SubmissionUpdate {
            event: Event {
                status: status,
                update_id: event_count,
                submission_id: submission.id,
            },
            user_id: user_id,
        });
        if let Err(e) = err {
            error!("Error sending update: {}", e);
        }
        event_count += 1;
    };

    if submission.files.len() != 1 {
        error!(
            "Multi-file submissions are not supported yet! \
             Marking {} as InternalError",
            submission.id
        );
        mark_internal_error(conn, submission)?;
        return Err(EvaluationError::WrongNumberOfFiles {
            number: submission.files.len(),
        }
        .into());
    }

    let submission_path = submission_dir
        .join(Path::new(&submission.id.to_string()))
        .join(Path::new(&submission.files[0]));

    let submission_path = std::fs::canonicalize(submission_path)?;

    let mut tm = Command::new(task_maker)
        .arg("--ui=json")
        // unneeded checks for the evaluation
        .arg("--no-statement")
        .arg("--no-sanity-checks")
        .arg("--task-dir")
        .arg(&path)
        .arg(&submission_path)
        .stdout(Stdio::piped())
        .spawn()?;

    update_status(crate::events::SubmissionStatus::Started);

    let mut score = 0.0;

    {
        let stdout = tm.stdout.as_mut().unwrap();
        let stdout_reader = BufReader::new(stdout);
        let stdout_lines = stdout_reader.lines();

        for line in stdout_lines {
            let line = line?;
            let message = serde_json::from_str::<TaskMakerMessage>(&line);
            match message {
                Ok(TaskMakerMessage::Compilation(comp)) => {
                    // TODO: compilation stderr
                    if comp.data.path == submission_path.to_str().unwrap_or("")
                    {
                        if comp.state == State::Skipped
                            || comp.state == State::Failure
                        {
                            update_status(
                                crate::events::SubmissionStatus::Compiled {
                                    compiler_stderr: "".to_owned(),
                                    success: false,
                                },
                            );
                        }
                        if comp.state == State::Success {
                            update_status(
                                crate::events::SubmissionStatus::Compiled {
                                    compiler_stderr: "".to_owned(),
                                    success: true,
                                },
                            );
                        }
                    }
                }
                // TODO: other events (TestcaseScored, SubtaskScored)
                Ok(TaskMakerMessage::IOIResult(result)) => {
                    score = populate_ioi_submission_results(
                        &conn, submission, &result,
                    )
                    .map_err(|err| {
                        error!(
                            "Failed to store the evaluation results \
                             for submission {}, marking as internal error",
                            submission.id
                        );
                        match crate::mark_internal_error(conn, submission) {
                            Err(e) => return e,
                            _ => {}
                        };
                        err
                    })?;
                }
                Ok(TaskMakerMessage::TerryResult(result)) => {
                    score = populate_terry_submission_results(
                        &conn, submission, &result,
                    )
                    .map_err(|err| {
                        error!(
                            "Failed to store the evaluation results \
                             for submission {}, marking as internal error",
                            submission.id
                        );
                        match crate::mark_internal_error(conn, submission) {
                            Err(e) => return e,
                            _ => {}
                        };
                        err
                    })?;
                }
                Err(err) => {
                    error!("err: {} {}", err, line);
                    update_status(crate::events::SubmissionStatus::Error {
                        message: err.to_string(),
                    });
                }
                _ => {}
            }
        }
    }

    tm.wait()?;

    Ok(score)
}

fn populate_ioi_submission_results(
    conn: &PgConnection,
    submission: &Submission,
    result: &IOIResult,
) -> Result<f64, Error> {
    use crate::schema::tasks::dsl::*;
    let compilation = result
        .solutions
        .get(&submission.files[0])
        .expect("Solution compilation not present for this submission");
    let solution_result = result
        .testing
        .get(&submission.files[0])
        .expect("Solution result not present for this submission");

    let compilation_stderr = compilation
        .compilation
        .as_ref()
        .map(|ex| ex.stderr.as_ref().map(|s| s.as_str()))
        .unwrap_or(None)
        .unwrap_or("");

    // if the compilation has failed short circuit here
    if compilation.status == SourceFileCompilationStatus::Failure {
        use crate::schema::submissions::dsl::*;
        diesel::update(submissions.find(submission.id))
            .set((
                status.eq(SubmissionStatus::CompilationError),
                crate::schema::submissions::dsl::score.eq(0.0),
                compilation_messages.eq(compilation_stderr),
            ))
            .execute(conn)?;
        debug!("Evaluation of submission {} completed", submission.id);
        return Ok(0.0);
    }

    let task = tasks.find(submission.task_id).get_result::<Task>(conn)?;
    let subtasks: HashMap<SubtaskNum, Subtask> = Subtask::belonging_to(&task)
        .load::<Subtask>(conn)?
        .into_iter()
        .map(|st| (st.num, st))
        .collect();

    let new_subtask_results: Vec<NewSubtaskResult> = solution_result
        .subtask_scores
        .iter()
        .map(|(st_num, score)| NewSubtaskResult {
            submission_id: submission.id,
            score: (*score).into(),
            subtask_id: subtasks.get(&st_num).expect("Subtask not found").id,
        })
        .collect();

    conn.transaction(|| -> Result<(), diesel::result::Error> {
        use crate::schema::submissions::dsl::*;
        use crate::schema::subtask_results::dsl::*;
        use crate::schema::testcase_results::dsl::*;

        // update the submission
        diesel::update(submissions.find(submission.id))
            .set((
                status.eq(SubmissionStatus::Success),
                crate::schema::submissions::dsl::score
                    .eq(solution_result.score as f64),
                compilation_messages.eq(compilation_stderr),
            ))
            .execute(conn)?;

        // insert the subtask results
        let inserted_subtasks: HashMap<i32, i32> =
            diesel::insert_into(subtask_results)
                .values(&new_subtask_results)
                .returning((
                    crate::schema::subtask_results::dsl::subtask_id,
                    crate::schema::subtask_results::dsl::id,
                ))
                .get_results::<(i32, i32)>(conn)?
                .into_iter()
                .collect();

        // create and insert the testcase results
        let new_testcase_results: Vec<NewTestcaseResult> = solution_result
            .testcase_results
            .iter()
            .map(|(st_num, subtask)| {
                subtask
                    .iter()
                    .map(|(tc_num, testcase)| {
                        NewTestcaseResult::from_ioi_testcase_result(
                            // find the id of the subtask_result
                            *inserted_subtasks
                                .get(
                                    &subtasks
                                        .get(st_num)
                                        .expect("Subtask not found")
                                        .id,
                                )
                                .expect("Result of subtask not inserted"),
                            *tc_num,
                            testcase,
                        )
                    })
                    .collect()
            })
            .concat();
        diesel::insert_into(testcase_results)
            .values(new_testcase_results)
            .execute(conn)?;

        // commit the transaction
        Ok(())
    })?;
    debug!("Evaluation of submission {} completed", submission.id);
    Ok(solution_result.score as f64)
}

fn populate_terry_submission_results(
    _conn: &PgConnection,
    _submission: &Submission,
    _result: &TerryResult,
) -> Result<f64, Error> {
    unimplemented!();
}

/// Evaluate a submission already present in the DB, will call task-maker and
/// when the evaluation is completed the results are stored in the DB.
/// If an error condition occurs the submission is flagged as internal_error.
pub struct Evaluator {
    conn: PgConnection,
    in_evaluation: Arc<Mutex<HashSet<i32>>>,
}

#[derive(Message)]
#[rtype(result = "Result<(), Error>")]
pub struct Evaluate {
    pub submission: Submission,
    pub user_id: i32,
    pub notify: Recipient<SubmissionUpdate>,
}

impl Evaluator {
    pub fn new(
        conn: PgConnection,
        in_eval: Arc<Mutex<HashSet<i32>>>,
    ) -> Evaluator {
        Evaluator {
            conn: conn,
            in_evaluation: in_eval,
        }
    }
}

impl Actor for Evaluator {
    type Context = SyncContext<Self>;
}

impl Handler<Evaluate> for Evaluator {
    type Result = Result<(), Error>;
    fn handle(&mut self, msg: Evaluate, _: &mut Self::Context) -> Self::Result {
        let send_status = |status| {
            let err = msg.notify.do_send(SubmissionUpdate {
                event: Event {
                    status: status,
                    update_id: 0,
                    submission_id: msg.submission.id,
                },
                user_id: msg.user_id,
            });
            if let Err(e) = err {
                error!("Error sending update: {}", e);
            }
        };
        let is_evaluating = self
            .in_evaluation
            .lock()
            .unwrap()
            .contains(&msg.submission.id);
        if is_evaluating {
            error!(
                "Submission {} is already being evaluated!",
                msg.submission.id
            );
            let err: Error = EvaluationError::AlreadyEvaluating.into();
            send_status(crate::events::SubmissionStatus::Error {
                message: err.to_string(),
            });
            return Err(err);
        }
        self.in_evaluation.lock().unwrap().insert(msg.submission.id);
        defer! {{
            self.in_evaluation.lock().unwrap().remove(&msg.submission.id);
        }};
        let result = evaluate_submission(
            &self.conn,
            &msg.submission,
            &msg.notify,
            msg.user_id,
        );
        match result {
            Err(e) => {
                send_status(crate::events::SubmissionStatus::Error {
                    message: e.to_string(),
                });
                Err(e)
            }
            Ok(score) => {
                send_status(crate::events::SubmissionStatus::Done {
                    score: score,
                });
                Ok(())
            }
        }
    }
}

/// Actor that will look for pending submissions and evaluate them when it receives the
/// EvaluatePending message.
pub struct CheckPending(pub Addr<Evaluator>);

impl Actor for CheckPending {
    type Context = Context<Self>;
}

pub struct EvaluatePending(pub Recipient<crate::events::SubmissionUpdate>);

impl Message for EvaluatePending {
    type Result = Result<(), Error>;
}

impl Handler<EvaluatePending> for CheckPending {
    type Result = ResponseActFuture<Self, (), failure::Error>;

    fn handle(
        &mut self,
        msg: EvaluatePending,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        use crate::schema::participations::dsl::*;
        use crate::schema::submissions::dsl::*;

        // TODO: remove blocking

        let conn = crate::establish_connection();

        let results = submissions
            .filter(status.eq(SubmissionStatus::Waiting))
            .load::<Submission>(&conn);

        let results = match results {
            Ok(r) => r,
            Err(e) => return Box::new(actix::fut::err(e.into())),
        };

        info!("Found {} waiting submissions", results.len());
        let mut futs = vec![];
        for sub in results {
            let participation = participations
                .filter(
                    crate::schema::participations::dsl::id
                        .eq(sub.participation_id),
                )
                .load::<Participation>(&conn)
                .expect("Error loading participation");
            assert!(participation.len() == 1);
            let participation = &participation[0];
            futs.push(self.0.send(crate::evaluation::Evaluate {
                user_id: participation.user_id,
                submission: sub,
                notify: msg.0.clone(),
            }));
        }

        let fut = join_all(futs)
            .and_then(|results| {
                for res in results {
                    if let Err(err) = res {
                        error!("{}", err);
                    }
                }
                ok(())
            })
            .map_err(|e| panic!("{}", e));
        Box::new(actix::fut::wrap_future::<_, Self>(fut))
    }
}
