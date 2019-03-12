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
pub mod models;
pub mod schema;
pub mod task_maker_ui;
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
/// let conn = establish_connection();
/// # conn.test_transaction(|| -> Result<(), diesel::result::Error> {
/// # let (site, contest, user, part, task, submission) = fake_data(&conn);
/// mark_internal_error(&conn, &submission);
/// let submission = submissions.find(submission.id).first::<Submission>(&conn).unwrap();
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

pub mod test_utils {
    use diesel::pg::PgConnection;
    use diesel::query_dsl::{QueryDsl, RunQueryDsl};

    use crate::models::*;

    /// Create a fake site, use this only for testing.
    pub fn fake_site(conn: &PgConnection, domain: &str) -> Site {
        let site_id = diesel::insert_into(crate::schema::sites::dsl::sites)
            .values(NewSite {
                domain: domain.to_string(),
            })
            .returning(crate::schema::sites::dsl::id)
            .get_results::<i32>(conn)
            .unwrap();
        crate::schema::sites::dsl::sites
            .find(site_id[0])
            .first::<Site>(conn)
            .unwrap()
    }

    /// Create a fake contest, use this only for testing.
    pub fn fake_contest(
        conn: &PgConnection,
        site: &Site,
        name: &str,
    ) -> Contest {
        let contest_id =
            diesel::insert_into(crate::schema::contests::dsl::contests)
                .values(NewContest {
                    site_id: site.id,
                    name: name.to_string(),
                })
                .returning(crate::schema::contests::dsl::id)
                .get_results::<i32>(conn)
                .unwrap();
        crate::schema::contests::dsl::contests
            .find(contest_id[0])
            .first::<Contest>(conn)
            .unwrap()
    }

    /// Create a fake user, use this only for testing.
    pub fn fake_user(conn: &PgConnection, site: &Site, username: &str) -> User {
        let user_id = diesel::insert_into(crate::schema::users::dsl::users)
            .values(NewUser {
                site_id: site.id,
                username: username.to_string(),
            })
            .returning(crate::schema::users::dsl::id)
            .get_results::<i32>(conn)
            .unwrap();
        crate::schema::users::dsl::users
            .find(user_id[0])
            .first::<User>(conn)
            .unwrap()
    }

    /// Create a fake participation, use this only for testing.
    pub fn fake_participation(
        conn: &PgConnection,
        contest: &Contest,
        user: &User,
    ) -> Participation {
        let participation_id = diesel::insert_into(
            crate::schema::participations::dsl::participations,
        )
        .values(NewParticipation {
            contest_id: contest.id,
            user_id: user.id,
        })
        .returning(crate::schema::participations::dsl::id)
        .get_results::<i32>(conn)
        .unwrap();
        crate::schema::participations::dsl::participations
            .find(participation_id[0])
            .first::<Participation>(conn)
            .unwrap()
    }

    /// Create a fake task, use this only for testing.
    pub fn fake_task(
        conn: &PgConnection,
        contest: &Contest,
        name: &str,
    ) -> Task {
        let task_id = diesel::insert_into(crate::schema::tasks::dsl::tasks)
            .values(NewTask {
                name: name,
                title: "The Task",
                time_limit: 1.0,
                memory_limit: 123,
                contest_id: contest.id,
                format: TaskFormat::IOI,
                max_score: 100.0,
            })
            .returning(crate::schema::tasks::dsl::id)
            .get_results::<i32>(conn)
            .unwrap();
        crate::schema::tasks::dsl::tasks
            .find(task_id[0])
            .first::<Task>(conn)
            .unwrap()
    }

    /// Create a fake submission, use this only for testing.
    pub fn fake_submission(
        conn: &PgConnection,
        task: &Task,
        part: &Participation,
    ) -> Submission {
        let submission_id =
            diesel::insert_into(crate::schema::submissions::dsl::submissions)
                .values(NewSubmission {
                    task_id: task.id,
                    participation_id: part.id,
                    files: vec!["file.cpp".to_string()],
                })
                .returning(crate::schema::submissions::dsl::id)
                .get_results::<i32>(conn)
                .unwrap();
        crate::schema::submissions::dsl::submissions
            .find(submission_id[0])
            .first::<Submission>(conn)
            .unwrap()
    }

    /// Create some fake data in the DB, use this only for testing.
    pub fn fake_data(
        conn: &PgConnection,
    ) -> (Site, Contest, User, Participation, Task, Submission) {
        let site = fake_site(conn, "domain");
        let contest = fake_contest(conn, &site, "name");
        let user = fake_user(conn, &site, "username");
        let part = fake_participation(conn, &contest, &user);
        let task = fake_task(conn, &contest, "task");
        let sub = fake_submission(conn, &task, &part);
        (site, contest, user, part, task, sub)
    }
}
