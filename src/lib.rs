extern crate actix_web;
#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_derive_enum;
extern crate dotenv;
#[macro_use]
extern crate failure;
extern crate base64;
extern crate itertools;
extern crate rand;

use std::env;

use diesel::pg::PgConnection;
use diesel::prelude::*;
use failure::Error;

use crate::models::*;

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

pub mod test_utils {
    use diesel::pg::PgConnection;
    use diesel::query_dsl::{QueryDsl, RunQueryDsl};

    use crate::models::*;

    pub fn fake_site(conn: &PgConnection) -> Site {
        use crate::schema::sites::dsl::*;
        let site_id = diesel::insert_into(sites)
            .values(NewSite {
                domain: "domain".to_string(),
            })
            .returning(id)
            .get_results::<i32>(conn)
            .unwrap();
        sites.find(site_id[0]).first::<Site>(conn).unwrap()
    }

    pub fn fake_contest(conn: &PgConnection, site: &Site) -> Contest {
        use crate::schema::contests::dsl::*;
        let contest_id = diesel::insert_into(contests)
            .values(NewContest {
                site_id: site.id,
                name: "name".to_string(),
            })
            .returning(id)
            .get_results::<i32>(conn)
            .unwrap();
        contests.find(contest_id[0]).first::<Contest>(conn).unwrap()
    }

    pub fn fake_user(conn: &PgConnection, site: &Site) -> User {
        use crate::schema::users::dsl::*;
        let user_id = diesel::insert_into(users)
            .values(NewUser {
                site_id: site.id,
                username: "testuser".to_string(),
            })
            .returning(id)
            .get_results::<i32>(conn)
            .unwrap();
        users.find(user_id[0]).first::<User>(conn).unwrap()
    }

    pub fn fake_participation(
        conn: &PgConnection,
        contest: &Contest,
        user: &User,
    ) -> Participation {
        use crate::schema::participations::dsl::*;
        let participation_id = diesel::insert_into(participations)
            .values(NewParticipation {
                contest_id: contest.id,
                user_id: user.id,
            })
            .returning(id)
            .get_results::<i32>(conn)
            .unwrap();
        participations
            .find(participation_id[0])
            .first::<Participation>(conn)
            .unwrap()
    }

    pub fn fake_task(conn: &PgConnection, contest: &Contest) -> Task {
        use crate::schema::tasks::dsl::*;
        let task_id = diesel::insert_into(tasks)
            .values(NewTask {
                name: "task",
                title: "The Task",
                time_limit: 1.0,
                memory_limit: 123,
                contest_id: contest.id,
                format: TaskFormat::IOI,
                max_score: 100.0,
            })
            .returning(id)
            .get_results::<i32>(conn)
            .unwrap();
        tasks.find(task_id[0]).first::<Task>(conn).unwrap()
    }

    pub fn fake_submission(
        conn: &PgConnection,
        task: &Task,
        part: &Participation,
    ) -> Submission {
        use crate::schema::submissions::dsl::*;
        let submission_id = diesel::insert_into(submissions)
            .values(NewSubmission {
                task_id: task.id,
                participation_id: part.id,
                files: vec!["file.cpp".to_string()],
            })
            .returning(id)
            .get_results::<i32>(conn)
            .unwrap();
        submissions
            .find(submission_id[0])
            .first::<Submission>(conn)
            .unwrap()
    }

    pub fn fake_data(
        conn: &PgConnection,
    ) -> (Site, Contest, User, Participation, Task, Submission) {
        let site = fake_site(conn);
        let contest = fake_contest(conn, &site);
        let user = fake_user(conn, &site);
        let part = fake_participation(conn, &contest, &user);
        let task = fake_task(conn, &contest);
        let sub = fake_submission(conn, &task, &part);
        (site, contest, user, part, task, sub)
    }
}
