use crate::models::Site;
use actix::{Actor, Handler, Message, SyncContext};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::pg::PgConnection;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub mod contest;
pub mod participation;
pub mod submission;
pub mod task;
pub mod user;

pub use self::contest::*;
pub use self::participation::*;
pub use self::user::*;

pub struct Executor(PgConnection);

impl Executor {
    pub fn new(conn: PgConnection) -> Executor {
        Executor(conn)
    }
}

impl Actor for Executor {
    type Context = SyncContext<Self>;
}

pub struct GetSite {
    pub host: String,
}

impl Message for GetSite {
    type Result = Result<Site, Error>;
}

impl Handler<GetSite> for Executor {
    type Result = Result<Site, Error>;

    fn handle(&mut self, msg: GetSite, _: &mut Self::Context) -> Self::Result {
        use crate::schema::sites::dsl::*;

        let site_or_error =
            sites.filter(domain.eq(&msg.host)).load::<Site>(&self.0);

        match site_or_error {
            Ok(mut site) => {
                if site.len() == 0 {
                    Err(ErrorNotFound("No such site"))
                } else if site.len() == 1 {
                    Ok(site.swap_remove(0))
                } else {
                    panic!("Broken DB")
                }
            }
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}
