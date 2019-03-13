extern crate actix_web;
#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_derive_enum;
extern crate dotenv;
#[macro_use]
extern crate failure;
extern crate base64;
extern crate fs_extra;
extern crate itertools;
extern crate rand;
extern crate tempfile;

use std::env;

use diesel::pg::PgConnection;
use diesel::prelude::*;
use failure::Error;

use crate::models::*;
use fs_extra::dir::create_all;
use std::path::Path;
use std::path::PathBuf;

pub mod evaluation;
mod events;
pub mod models;
pub mod schema;
pub mod task_maker_ui;
pub mod test_utils;
pub mod web;

/// Connect to the Postgres database. The DATABASE_URL environment variable must
/// be set.
///
/// # Example
/// ```
/// use diesel::query_dsl::RunQueryDsl;
///
/// let conn = tmsocial::establish_connection();
/// diesel::sql_query("SELECT 1;").execute(&conn);
/// ```
pub fn establish_connection() -> PgConnection {
    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
}

/// Mark a submission as failed because an internal error.
///
/// # Example
/// ```
/// use diesel::query_dsl::{QueryDsl, RunQueryDsl};
/// use diesel::connection::Connection;
/// use tmsocial::{establish_connection, mark_internal_error};
/// use tmsocial::schema::submissions::dsl::submissions;
/// use tmsocial::models::{Submission, SubmissionStatus};
/// use tmsocial::test_utils::*;
///
/// # let site = FakeSite::new();
/// # let submission = site.make_submission();
/// # let conn = &site.conn;
/// mark_internal_error(conn, &submission);
/// let submission = submissions.find(submission.id).first::<Submission>(conn).unwrap();
/// assert_eq!(submission.status, SubmissionStatus::InternalError);
/// ```
pub fn mark_internal_error(
    conn: &PgConnection,
    submission: &Submission,
) -> Result<(), Error> {
    use crate::schema::submissions::dsl::*;
    diesel::update(submissions.find(submission.id))
        .set(status.eq(SubmissionStatus::InternalError))
        .execute(conn)?;
    Ok(())
}

/// Create and returns the path where the files of the provided submission
/// should be stored. The STORAGE_DIR environment var should be set and that
/// directory must be writable.
///
/// # Example
/// ```
/// use tempfile::TempDir;
/// use std::env;
/// use tmsocial::create_submission_dir;
///
/// # let dir = TempDir::new().unwrap();
/// # env::set_var("STORAGE_DIR", dir.path().as_os_str());
/// create_submission_dir(42);
/// ```
pub fn create_submission_dir(submission_id: i32) -> PathBuf {
    let storage_dir = PathBuf::new().join(Path::new(
        &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
    ));
    let submission_dir = storage_dir
        .join(Path::new("submissions"))
        .join(Path::new(&submission_id.to_string()));

    create_all(&submission_dir, false).unwrap();

    submission_dir
}
