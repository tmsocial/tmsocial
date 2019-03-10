use super::Executor;
use crate::models::Participation;
use actix::{Handler, Message};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub struct GetParticipation {
    pub user_id: i32,
    pub contest_id: i32,
}

impl Message for GetParticipation {
    type Result = Result<Participation, Error>;
}

impl Handler<GetParticipation> for Executor {
    type Result = Result<Participation, Error>;

    fn handle(
        &mut self,
        msg: GetParticipation,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::participations::dsl::*;

        let participation_or_error = participations
            .filter(user_id.eq(&msg.user_id))
            .filter(contest_id.eq(&msg.contest_id))
            .load::<Participation>(&self.0);

        match participation_or_error {
            Ok(mut participation) => {
                if participation.len() == 0 {
                    Err(ErrorNotFound("No such participation"))
                } else if participation.len() == 1 {
                    Ok(participation.swap_remove(0))
                } else {
                    panic!("Broken DB")
                }
            }
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}
