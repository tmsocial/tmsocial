#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_derive_enum;
extern crate dotenv;
extern crate itertools;
#[macro_use]
extern crate failure;

extern crate actix_web;

pub mod evaluation;
pub mod models;
pub mod schema;
pub mod task_maker_ui;
pub mod web;

use crate::models::*;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use failure::Error;
use std::env;

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
/// use tmsocial::{establish_connection, mark_internal_error};
/// use tmsocial::schema::submissions::dsl::submissions;
/// use tmsocial::models::{Submission, SubmissionStatus};
/// use diesel::query_dsl::QueryDsl;
/// use diesel::query_dsl::RunQueryDsl;
/// use diesel::connection::Connection;
///
/// let conn = establish_connection();
/// # conn.test_transaction(|| -> Result<(), diesel::result::Error> {
/// # diesel::sql_query(
/// #     "INSERT INTO tasks \
/// #     (id, name, title, time_limit, memory_limit, max_score, format) VALUES \
/// #     (-1, 'a', 'b', 1, 1, 1, 'ioi')").execute(&conn);
/// # diesel::sql_query(
/// #     "INSERT INTO submissions \
/// #     (id, files, status, task_id) VALUES \
/// #     (-1, '{}', 'waiting', -1)").execute(&conn);
/// let submission = submissions.find(-1).first::<Submission>(&conn).unwrap();
/// mark_internal_error(&conn, &submission);
/// let submission = submissions.find(-1).first::<Submission>(&conn).unwrap();
/// assert_eq!(submission.status, SubmissionStatus::InternalError);
/// # Ok(())
/// # });
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
