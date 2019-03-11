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

pub struct GetParticipationsByUser {
    pub user_id: i32,
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

        let participation = participations
            .filter(user_id.eq(&msg.user_id))
            .filter(contest_id.eq(&msg.contest_id))
            .first::<Participation>(&self.0);
        match participation {
            Ok(participation) => Ok(participation),
            Err(diesel::result::Error::NotFound) => {
                Err(ErrorNotFound(format!("No such participation")))
            }
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}

impl Message for GetParticipationsByUser {
    type Result = Result<Vec<Participation>, Error>;
}

impl Handler<GetParticipationsByUser> for Executor {
    type Result = Result<Vec<Participation>, Error>;

    fn handle(
        &mut self,
        msg: GetParticipationsByUser,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::participations::dsl::*;

        let parts = participations
            .filter(user_id.eq(&msg.user_id))
            .load::<Participation>(&self.0);
        match parts {
            Ok(parts) => Ok(parts),
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}
