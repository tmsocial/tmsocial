use diesel::pg::PgConnection;
use diesel::{ExpressionMethods, RunQueryDsl};
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
        let domain = random_string();
        println!("Creating fake site with domain {}", domain);
        let conn = establish_connection();
        let site = diesel::insert_into(crate::schema::sites::dsl::sites)
            .values(NewSite { domain: domain })
            .get_result::<Site>(&conn)
            .expect("Failed to create fake site");
        FakeSite { site, conn }
    }

    /// Create a fake contest in this site
    pub fn contest(self: &Self, name: &str) -> Contest {
        diesel::insert_into(crate::schema::contests::dsl::contests)
            .values(NewContest {
                site_id: self.site.id,
                name: name.to_string(),
            })
            .get_result::<Contest>(&self.conn)
            .unwrap()
    }

    /// Create a fake user in this site
    pub fn user(self: &Self, username: &str) -> User {
        diesel::insert_into(crate::schema::users::dsl::users)
            .values(NewUser {
                site_id: self.site.id,
                username: username.to_string(),
            })
            .get_result::<User>(&self.conn)
            .unwrap()
    }

    /// Create a fake participation
    pub fn participation(
        self: &Self,
        contest: &Contest,
        user: &User,
    ) -> Participation {
        diesel::insert_into(crate::schema::participations::dsl::participations)
            .values(NewParticipation {
                contest_id: contest.id,
                user_id: user.id,
            })
            .get_result::<Participation>(&self.conn)
            .unwrap()
    }

    /// Create a fake participation and a contest and a user
    pub fn make_participation(self: &Self) -> Participation {
        let contest = self.contest(&random_string());
        let user = self.user(&random_string());
        let part = self.participation(&contest, &user);
        part
    }

    /// Create a fake task
    pub fn task(self: &Self, contest: &Contest, name: &str) -> Task {
        diesel::insert_into(crate::schema::tasks::dsl::tasks)
            .values(NewTask {
                name: name,
                title: "The Task",
                time_limit: 1.0,
                memory_limit: 123,
                contest_id: contest.id,
                format: TaskFormat::IOI,
                max_score: 100.0,
            })
            .get_result::<Task>(&self.conn)
            .unwrap()
    }

    /// Create a fake task and a contest
    pub fn make_task(self: &Self) -> Task {
        let contest = self.contest(&random_string());
        let task = self.task(&contest, &random_string());
        task
    }

    /// Create a fake submission
    pub fn submission(
        self: &Self,
        task: &Task,
        part: &Participation,
    ) -> Submission {
        diesel::insert_into(crate::schema::submissions::dsl::submissions)
            .values(NewSubmission {
                task_id: task.id,
                participation_id: part.id,
                files: vec!["file.cpp".to_string()],
            })
            .get_result::<Submission>(&self.conn)
            .unwrap()
    }

    /// Create a fake submission and a contest, a task, a user and a
    /// participation
    pub fn make_submission(self: &Self) -> Submission {
        let user = self.user(&random_string());
        let contest = self.contest(&random_string());
        let task = self.task(&contest, &random_string());
        let part = self.participation(&contest, &user);
        let sub = self.submission(&task, &part);
        sub
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

/// Generate a random string long enough that no collision can ever happen
fn random_string() -> String {
    thread_rng().sample_iter(&Alphanumeric).take(30).collect()
}
