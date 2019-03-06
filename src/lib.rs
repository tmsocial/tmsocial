#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_derive_enum;
extern crate dotenv;

pub mod models;
pub mod schema;

use crate::models::*;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use failure::Error;
use std::env;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::path::PathBuf;
use std::process::{Command, Stdio};

pub fn establish_connection() -> PgConnection {
    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
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
        panic!("Multi-file submissions are not supported yet!");
    }

    let submission_path = submission_dir
        .join(Path::new(&submission.id.to_string()))
        .join(Path::new(&submission.files[0]));

    let submission_path = std::fs::canonicalize(submission_path)?;

    let mut tm = Command::new(task_maker)
        .arg("--ui=json")
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
            println!("{}", line?);
        }
    }

    tm.wait()?;

    Ok(())
}
