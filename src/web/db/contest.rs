use super::Executor;
use crate::models::Contest;
use crate::models::NewParticipation;
use actix::{Handler, Message};
use actix_web::error::ErrorUnprocessableEntity;
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::result::DatabaseErrorKind;
use diesel::result::Error::DatabaseError;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub struct GetContest {
    pub id: i32,
}

pub struct GetContests {
    pub site_id: i32,
}

pub struct JoinContest {
    pub contest_id: i32,
    pub user_id: i32,
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

impl Message for GetContests {
    type Result = Result<Vec<Contest>, Error>;
}

impl Handler<GetContests> for Executor {
    type Result = Result<Vec<Contest>, Error>;

    fn handle(
        &mut self,
        msg: GetContests,
        _: &mut Self::Context,
    ) -> Self::Result {
        let contests = crate::schema::contests::dsl::contests
            .filter(crate::schema::contests::columns::site_id.eq(&msg.site_id))
            .load::<Contest>(&self.0);
        match contests {
            Ok(contests) => Ok(contests),
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}

impl Message for JoinContest {
    type Result = Result<(), Error>;
}

impl Handler<JoinContest> for Executor {
    type Result = Result<(), Error>;

    fn handle(
        &mut self,
        msg: JoinContest,
        _: &mut Self::Context,
    ) -> Self::Result {
        let insert_res = diesel::insert_into(
            crate::schema::participations::dsl::participations,
        )
        .values(NewParticipation {
            contest_id: msg.contest_id,
            user_id: msg.user_id,
        })
        .execute(&self.0);
        match insert_res {
            Ok(_) => Ok(()),
            Err(DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
                Err(ErrorUnprocessableEntity(format!(
                    "Participation already present"
                )))
            }
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}
