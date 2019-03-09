use actix::{Actor, Handler, Message, SyncContext};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::pg::PgConnection;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub struct Executor(PgConnection);

impl Executor {
    pub fn new(conn: PgConnection) -> Executor {
        Executor(conn)
    }
}

impl Actor for Executor {
    type Context = SyncContext<Self>;
}

pub struct GetSiteId {
    pub host: String,
}

impl Message for GetSiteId {
    type Result = Result<i32, Error>;
}

impl Handler<GetSiteId> for Executor {
    type Result = Result<i32, Error>;

    fn handle(
        &mut self,
        msg: GetSiteId,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::sites::dsl::*;

        let site_or_error = sites
            .filter(domain.eq(&msg.host))
            .load::<crate::models::Site>(&self.0);

        match site_or_error {
            Ok(site) => {
                if site.len() == 0 {
                    Err(ErrorNotFound("No such site"))
                } else if site.len() == 1 {
                    Ok(site[0].id)
                } else {
                    panic!("Broken DB")
                }
            }
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}
