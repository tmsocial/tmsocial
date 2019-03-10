use super::Executor;
use crate::models::Submission;
use actix::{Handler, Message};
use actix_web::error::ErrorInternalServerError;
use actix_web::Error;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub struct GetSubmissions {
    pub participation_id: i32,
    pub task_id: i32,
}

impl Message for GetSubmissions {
    type Result = Result<Vec<Submission>, Error>;
}

impl Handler<GetSubmissions> for Executor {
    type Result = Result<Vec<Submission>, Error>;

    fn handle(
        &mut self,
        msg: GetSubmissions,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::submissions::dsl::*;

        let subs = submissions
            .filter(participation_id.eq(&msg.participation_id))
            .filter(task_id.eq(&msg.task_id))
            .load::<Submission>(&self.0);
        match subs {
            Ok(subs) => Ok(subs),
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}
