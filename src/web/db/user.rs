use actix::{Handler, Message};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};
use rand::Rng;

use crate::models::User;

use super::Executor;

type LoginToken = String;

pub struct GetUser {
    pub id: i32,
}

#[derive(Debug)]
pub struct GetUserByUsername {
    pub site_id: i32,
    pub username: String,
}

pub struct GetUserByToken {
    pub login_token: String,
}

pub struct DoLogin {
    pub site_id: i32,
    pub username: String,
}

impl Message for GetUser {
    type Result = Result<User, Error>;
}

impl Message for GetUserByUsername {
    type Result = Result<User, Error>;
}

impl Message for GetUserByToken {
    type Result = Result<User, Error>;
}

impl Message for DoLogin {
    type Result = Result<(User, LoginToken), Error>;
}

impl Handler<GetUser> for Executor {
    type Result = Result<User, Error>;

    fn handle(&mut self, msg: GetUser, _: &mut Self::Context) -> Self::Result {
        use crate::schema::users::dsl::*;

        let user = users.find(&msg.id).first::<User>(&self.0);

        match user {
            Ok(user) => Ok(user),
            Err(diesel::result::Error::NotFound) => {
                Err(ErrorNotFound(format!("No such user")))
            }
            Err(err) => Err(ErrorInternalServerError(err)),
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

        let user = users
            .filter(site_id.eq(&msg.site_id))
            .filter(username.eq(&msg.username))
            .first::<User>(&self.0);

        match user {
            Ok(user) => Ok(user),
            Err(diesel::result::Error::NotFound) => {
                Err(ErrorNotFound(format!("No such user")))
            }
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}

impl Handler<GetUserByToken> for Executor {
    type Result = Result<User, Error>;

    fn handle(
        &mut self,
        msg: GetUserByToken,
        _: &mut Self::Context,
    ) -> Self::Result {
        use crate::schema::users::dsl::*;

        let user = users
            .filter(login_token.eq(&msg.login_token))
            .first::<User>(&self.0);

        match user {
            Ok(user) => Ok(user),
            Err(diesel::result::Error::NotFound) => {
                Err(ErrorNotFound(format!("Invalid token")))
            }
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}

impl Handler<DoLogin> for Executor {
    type Result = Result<(User, LoginToken), Error>;

    fn handle(&mut self, msg: DoLogin, _: &mut Self::Context) -> Self::Result {
        use crate::schema::users::dsl::*;

        let user = users
            .filter(site_id.eq(&msg.site_id))
            .filter(username.eq(&msg.username))
            .first::<User>(&self.0);
        match user {
            Ok(user) => {
                let token = if let Some(token) = user.login_token.clone() {
                    token
                } else {
                    let token = gen_token();
                    diesel::update(users)
                        .set(login_token.eq(&token))
                        .filter(id.eq(user.id))
                        .execute(&self.0)
                        .map_err(|e| ErrorInternalServerError(e))?;
                    token
                };
                Ok((user, token))
            }
            Err(diesel::result::Error::NotFound) => {
                Err(ErrorNotFound(format!("Login failed")))
            }
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}

fn gen_token() -> String {
    let mut arr = [0u8; 31];
    rand::thread_rng().fill(&mut arr[..]);
    base64::encode(&arr)
}
