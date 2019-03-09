#![allow(proc_macro_derive_resolution_fallback)]

use std::collections::HashMap;
use std::env;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use diesel::pg::PgConnection;
use diesel::prelude::*;
use failure::Error;
use itertools::Itertools;

use crate::mark_internal_error;
use crate::models::*;
use crate::schema::{subtask_results, testcase_results};
use crate::task_maker_ui::ioi::IOIResult;
use crate::task_maker_ui::ioi::IOISolutionTestCaseResult;
use crate::task_maker_ui::SourceFileCompilationStatus;
use crate::task_maker_ui::SubtaskNum;
use crate::task_maker_ui::TaskMakerMessage;

#[derive(Insertable, Debug)]
#[table_name = "subtask_results"]
struct NewSubtaskResult {
    pub submission_id: i32,
    pub score: f64,
    pub subtask_id: i32,
}

#[derive(Insertable, Debug)]
#[table_name = "testcase_results"]
struct NewTestcaseResult<'a> {
    pub subtask_result_id: i32,
    pub running_time: f64,
    pub memory_usage: i32,
    pub message: &'a str,
    pub score: f64,
    pub num: i32,
}

impl<'a> NewTestcaseResult<'a> {
    fn from_ioi_testcase_result(
        subtask_result_id: i32,
        tc_num: i32,
        testcase: &IOISolutionTestCaseResult,
    ) -> NewTestcaseResult {
        let resources = &testcase.result[0]
            .as_ref()
            .expect("Constructing NewTestcaseResult with an invalid state")
            .resources;
        let running_time = resources.cpu_time + resources.sys_time;
        NewTestcaseResult {
            subtask_result_id: subtask_result_id,
            running_time: running_time as f64,
            memory_usage: resources.memory as i32,
            message: &testcase.message,
            score: testcase.score as f64,
            num: tc_num,
        }
    }
}

pub fn evaluate_submission(
    conn: &PgConnection,
    submission: &Submission,
) -> Result<(), Error> {
    let task_maker = env::var("TASK_MAKER").expect("TASK_MAKER must be set");
    let submission_dir = PathBuf::new().join(Path::new(
        &env::var("SUBMISSION_STORAGE_DIR")
            .expect("SUBMISSION_STORAGE_DIR must be set"),
    ));
    let task_dir = PathBuf::new().join(Path::new(
        &env::var("TASK_STORAGE_DIR").expect("TASK_STORAGE_DIR must be set"),
    ));

    let path = task_dir.join(Path::new(&submission.task_id.to_string()));

    if submission.files.len() != 1 {
        println!("Multi-file submissions are not supported yet! Marking {} as InternalError", submission.id);
        mark_internal_error(conn, submission)?;
        return Ok(()); // TODO maybe this is an Error?
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

    {
        let stdout = tm.stdout.as_mut().unwrap();
        let stdout_reader = BufReader::new(stdout);
        let stdout_lines = stdout_reader.lines();

        for line in stdout_lines {
            let line = line?;
            let message = serde_json::from_str::<TaskMakerMessage>(&line);
            match message {
                Ok(TaskMakerMessage::IOIResult(result)) => {
                    populate_ioi_submission_results(&conn, submission, &result)?
                }
                // TODO populate_terry_submision_results...
                // TODO stream the messages to the frontend
                Err(err) => println!("err: {} {}", err, line),
                _ => {}
            }
        }
    }

    tm.wait()?;

    Ok(())
}

fn populate_ioi_submission_results(
    conn: &PgConnection,
    submission: &Submission,
    result: &IOIResult,
) -> Result<(), Error> {
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
        println!("Evaluation of submission {} completed", submission.id);
        return Ok(());
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
    println!("Evaluation of submission {} completed", submission.id);
    Ok(())
}
