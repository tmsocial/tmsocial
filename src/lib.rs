#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_derive_enum;
extern crate dotenv;
extern crate itertools;

pub mod evaluation;
pub mod models;
pub mod schema;
pub mod task_maker_ui;

use crate::models::*;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use failure::Error;
use std::env;

pub fn establish_connection() -> PgConnection {
    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
}

fn mark_internal_error(
    conn: &PgConnection,
    submission: &Submission,
) -> Result<(), Error> {
    use crate::schema::submissions::dsl::*;
    diesel::update(submissions.find(submission.id))
        .set(status.eq(SubmissionStatus::InternalError))
        .execute(conn)?;
    Ok(())
}
