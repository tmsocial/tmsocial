use super::Executor;
use crate::models::Contest;
use actix::{Handler, Message};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub struct GetContest {
    pub id: i32,
}

impl Message for GetContest {
    type Result = Result<Contest, Error>;
}

impl Handler<GetContest> for Executor {
    type Result = Result<Contest, Error>;

    fn handle(
        &mut self,
        msg: GetContest,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::contests::dsl::*;

        let contest_or_error =
            contests.filter(id.eq(&msg.id)).load::<Contest>(&self.0);

        match contest_or_error {
            Ok(mut contest) => {
                if contest.len() == 0 {
                    Err(ErrorNotFound("No such contest"))
                } else if contest.len() == 1 {
                    Ok(contest.swap_remove(0))
                } else {
                    panic!("Broken DB")
                }
            }
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}
