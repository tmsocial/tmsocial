use diesel::pg::PgConnection;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};

use crate::establish_connection;
use crate::models::*;

/// Fake Site container, this will wrap a Site and a DB connection. When this
/// object is dropped the site will be deleted.
///
/// # Example
/// ```
/// use diesel::query_dsl::{QueryDsl, RunQueryDsl};
/// use tmsocial::test_utils::*;
/// use tmsocial::schema::sites::dsl::sites;
/// use tmsocial::models::Site;
///
/// let conn = tmsocial::establish_connection();
/// let mut site_id = 0;
/// {
///     let site = FakeSite::new();
///     site_id = site.site.id;
///     let proof = sites.find(&site_id).first::<Site>(&conn).unwrap();
///     assert_eq!(site.site.domain, proof.domain);
/// }
/// assert!(sites.find(&site_id).first::<Site>(&conn).is_err());
/// ```
pub struct FakeSite {
    pub site: Site,
    pub conn: PgConnection,
}

impl FakeSite {
    /// Create a connection to the DB and create a fake site with a random
    /// random domain name
    pub fn new() -> FakeSite {
        let domain: String =
            thread_rng().sample_iter(&Alphanumeric).take(30).collect();
        println!("Creating fake site with domain {}", domain);
        let conn = establish_connection();
        let site = diesel::insert_into(crate::schema::sites::dsl::sites)
            .values(NewSite { domain: domain })
            .get_result::<Site>(&conn)
            .expect("Failed to create fake site");
        FakeSite { site, conn }
    }
}

impl Drop for FakeSite {
    fn drop(&mut self) {
        println!("Dropping fake site with domain {}", self.site.domain);
        diesel::delete(crate::schema::sites::dsl::sites)
            .filter(crate::schema::sites::dsl::id.eq(self.site.id))
            .execute(&self.conn)
            .expect("Failed to clean the db");
    }
}

/// Create a fake contest, use this only for testing.
pub fn fake_contest(conn: &PgConnection, site: &Site, name: &str) -> Contest {
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
    let participation_id =
        diesel::insert_into(crate::schema::participations::dsl::participations)
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
pub fn fake_task(conn: &PgConnection, contest: &Contest, name: &str) -> Task {
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
/// The returned result will look like this:
/// - fake_site (dropping this will drop all the other data)
/// - (contest_a, contest_b)
/// - (user_a, user_b)
/// - (part_aa, part_ab, part_bb): user_a in contest_{a, b}, user_b in contest_b
/// - (task_a, task_b): task_a in contest_a, task_b in contest_b
/// - (sub_aa, sub_ab, sub_bb): sub_aa (user_a, task_a), sub_ab (user_a, task_b)
pub fn fake_data() -> (
    FakeSite,
    (Contest, Contest),
    (User, User),
    (Participation, Participation, Participation),
    (Task, Task),
    (Submission, Submission, Submission),
) {
    let fake_site = FakeSite::new();
    let contest_a = fake_contest(&fake_site.conn, &fake_site.site, "contest_a");
    let contest_b = fake_contest(&fake_site.conn, &fake_site.site, "contest_b");
    let user_a = fake_user(&fake_site.conn, &fake_site.site, "user_a");
    let user_b = fake_user(&fake_site.conn, &fake_site.site, "user_b");
    let part_aa = fake_participation(&fake_site.conn, &contest_a, &user_a);
    let part_ab = fake_participation(&fake_site.conn, &contest_b, &user_a);
    let part_bb = fake_participation(&fake_site.conn, &contest_b, &user_b);
    let task_a = fake_task(&fake_site.conn, &contest_a, "task_a");
    let task_b = fake_task(&fake_site.conn, &contest_b, "task_b");
    let sub_aa = fake_submission(&fake_site.conn, &task_a, &part_aa);
    let sub_ab = fake_submission(&fake_site.conn, &task_b, &part_ab);
    let sub_bb = fake_submission(&fake_site.conn, &task_b, &part_bb);
    (
        fake_site,
        (contest_a, contest_b),
        (user_a, user_b),
        (part_aa, part_ab, part_bb),
        (task_a, task_b),
        (sub_aa, sub_ab, sub_bb),
    )
}
