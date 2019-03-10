use super::Executor;
use crate::models::User;
use actix::{Handler, Message};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub struct GetUser {
    pub id: i32,
}

#[derive(Debug)]
pub struct GetUserByUsername {
    pub site_id: i32,
    pub username: String,
}

impl Message for GetUser {
    type Result = Result<User, Error>;
}

impl Message for GetUserByUsername {
    type Result = Result<User, Error>;
}

impl Handler<GetUser> for Executor {
    type Result = Result<User, Error>;

    fn handle(&mut self, msg: GetUser, _: &mut Self::Context) -> Self::Result {
        use crate::schema::users::dsl::*;

        let user_or_error = users.filter(id.eq(&msg.id)).load::<User>(&self.0);

        match user_or_error {
            Ok(mut user) => {
                if user.len() == 0 {
                    Err(ErrorNotFound("No such user"))
                } else if user.len() == 1 {
                    Ok(user.swap_remove(0))
                } else {
                    panic!("Broken DB")
                }
            }
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}

impl Handler<GetUserByUsername> for Executor {
    type Result = Result<User, Error>;

    fn handle(
        &mut self,
        msg: GetUserByUsername,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::users::dsl::*;

        let user_or_error = users
            .filter(site_id.eq(&msg.site_id))
            .filter(username.eq(&msg.username))
            .load::<User>(&self.0);

        match user_or_error {
            Ok(mut user) => {
                if user.len() == 0 {
                    Err(ErrorNotFound("No such user"))
                } else if user.len() == 1 {
                    Ok(user.swap_remove(0))
                } else {
                    panic!("Broken DB")
                }
            }
            Err(error) => Err(ErrorInternalServerError(error)),
        }
    }
}
