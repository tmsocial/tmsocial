use std::fmt::Display;

use actix_web::error::{ErrorBadRequest, ErrorForbidden, ResponseError};
use actix_web::http::header::HOST;
use actix_web::http::Cookie;
use actix_web::http::StatusCode;
use actix_web::{Error, FromRequest, HttpRequest, HttpResponse, Path};
use failure::Fail;
use futures::{future, Future};
use log::warn;
use serde_derive::Deserialize;
use url::Url;

use crate::models::*;
use crate::web::db::user::GetUserByToken;

use super::db::{GetContest, GetParticipation, GetSite, GetTask};
use super::State;

impl FromRequest<State> for Site {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        match get_current_host(req) {
            Ok(host) => Box::new(
                req.state()
                    .db
                    .send(GetSite { host })
                    .from_err()
                    .and_then(|res| res),
            ),
            Err(err) => Box::new(future::err(err)),
        }
    }
}

pub const AUTH_COOKIE: &'static str = "auth";

#[derive(Debug)]
struct ForbiddenResetCookie;

impl Display for ForbiddenResetCookie {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "Invalid token")
    }
}

impl Fail for ForbiddenResetCookie {}

impl ResponseError for ForbiddenResetCookie {
    fn error_response(&self) -> HttpResponse {
        let mut response = HttpResponse::new(StatusCode::FORBIDDEN);
        let mut cookie = Cookie::named(AUTH_COOKIE);
        cookie.set_path("/");
        response.add_cookie(&cookie).unwrap();
        response
    }
}

impl FromRequest<State> for User {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        match get_auth_token(req) {
            Some(token) => Box::new(
                req.state()
                    .db
                    .send(GetUserByToken { login_token: token })
                    .from_err()
                    .and_then(|res| res)
                    .map_err(|_err| Error::from(ForbiddenResetCookie {})),
            ),
            None => Box::new(future::err(ErrorForbidden("Logged out"))),
        }
    }
}

#[derive(Deserialize, Debug)]
struct ContestID {
    pub contest_id: i32,
}

impl FromRequest<State> for Contest {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        let contest_id = Path::<ContestID>::extract(req)
            .expect("Asking for contest on a path with no contest_id param!")
            .contest_id;

        Box::new(
            req.state()
                .db
                .send(GetContest { id: contest_id })
                .from_err()
                .and_then(|res| res),
        )
    }
}

impl FromRequest<State> for Participation {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        let contest_id = Path::<ContestID>::extract(req)
            .expect("Asking for contest on a path with no contest_id param!")
            .contest_id;
        let token = match get_auth_token(req) {
            Some(token) => token,
            None => {
                return Box::new(future::err(Error::from(
                    ForbiddenResetCookie {},
                )))
            }
        };
        let db = req.state().db.clone();
        let user = db.send(GetUserByToken { login_token: token });
        let participation = user
            .map_err(|x| x.into())
            .and_then(|res| match res {
                Ok(r) => future::done(Ok(r)),
                Err(_) => {
                    future::done(Err(Error::from(ForbiddenResetCookie {})))
                }
            })
            .and_then(move |user| {
                db.send(GetParticipation {
                    user_id: user.id,
                    contest_id: contest_id,
                })
                .from_err()
                .and_then(|res| res)
            });
        Box::new(participation)
    }
}

#[derive(Deserialize, Debug)]
struct TaskID {
    pub task_id: i32,
}

impl FromRequest<State> for Task {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        let contest_id = Path::<ContestID>::extract(req)
            .expect("Asking for contest on a path with no contest_id param!")
            .contest_id;
        let task_id = Path::<TaskID>::extract(req)
            .expect("Asking for task on a path with no task_id param!")
            .task_id;
        let task = req
            .state()
            .db
            .send(GetTask {
                id: task_id,
                contest_id: contest_id,
            })
            .from_err()
            .and_then(|res| res);
        Box::new(task)
    }
}

/// Extract the current host from the request, will fail if no Host is given
/// or if it's invalid.
fn get_current_host(
    req: &HttpRequest<State>,
) -> std::result::Result<String, Error> {
    let host = req.headers().get(HOST);
    let host = match host {
        Some(host) => host.to_str().unwrap_or("localhost"),
        None => {
            warn!("Invalid host header: {:?}", host);
            return Err(ErrorBadRequest("No host header"));
        }
    };
    let host = Url::parse(host);
    let host = if let Ok(host) = host {
        String::from(host.host_str().unwrap_or("localhost"))
    } else {
        warn!("Invalid host header: {:?}", host);
        return Err(ErrorBadRequest("Bad host header"));
    };
    Ok(host)
}

/// Extract the auth token from the cookies of the request.
fn get_auth_token(req: &HttpRequest<State>) -> Option<String> {
    req.cookie(AUTH_COOKIE).map(|c| c.value().to_string())
}
