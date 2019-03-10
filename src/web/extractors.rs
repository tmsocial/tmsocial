use super::db::{GetContest, GetParticipation, GetSite, GetUser};
use super::State;
use actix_web::error::{ErrorBadRequest, ErrorForbidden, ResponseError};
use actix_web::http::header::HOST;
use actix_web::http::Cookie;
use actix_web::http::StatusCode;
use actix_web::{Error, FromRequest, HttpRequest, HttpResponse, Path};
use failure::Fail;
use futures::{future, Future};
use log::warn;
use serde_derive::Deserialize;
use std::fmt::Display;
use url::Url;

use crate::models::*;

impl FromRequest<State> for Site {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        let host = req.headers().get(HOST);
        let host = match host {
            Some(host) => host.to_str().unwrap_or("localhost"),
            None => {
                warn!("Invalid host header: {:?}", host);
                return Box::new(future::err(ErrorBadRequest("No host header")));
            }
        };
        let host = Url::parse(host);
        let host = if let Ok(host) = host {
            String::from(host.host_str().unwrap_or("localhost"))
        } else {
            warn!("Invalid host header: {:?}", host);
            return Box::new(future::err(ErrorBadRequest("Bad host header")));
        };

        Box::new(
            req.state()
                .db
                .send(GetSite { host: host })
                .from_err()
                .and_then(|res| res),
        )
    }
}

const AUTH_COOKIE: &'static str = "auth";

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
        let cookie = req.cookie(AUTH_COOKIE);
        let user_id = match cookie {
            Some(cookie) => cookie.value().parse::<i32>(),
            None => return Box::new(future::err(ErrorForbidden("Logged out"))),
        };
        let user_id = match user_id {
            Ok(id) => id,
            Err(_) => {
                return Box::new(future::err(Error::from(
                    ForbiddenResetCookie {},
                )))
            }
        };
        Box::new(
            req.state()
                .db
                .send(GetUser { id: user_id })
                .from_err()
                .and_then(|res| res)
                .map_err(|_err| Error::from(ForbiddenResetCookie {})),
        )
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
        let cookie = req.cookie(AUTH_COOKIE);
        let user_id = match cookie {
            Some(cookie) => cookie.value().parse::<i32>(),
            None => return Box::new(future::err(ErrorForbidden("Logged out"))),
        };
        let user_id = match user_id {
            Ok(id) => id,
            Err(_) => {
                return Box::new(future::err(Error::from(
                    ForbiddenResetCookie {},
                )))
            }
        };
        let db = req.state().db.clone();
        let user = db.send(GetUser { id: user_id });
        let participation = user
            .map_err(|x| x.into())
            .and_then(|res| match res {
                Ok(r) => future::done(Ok(r)),
                Err(_) => {
                    future::done(Err(Error::from(ForbiddenResetCookie {})))
                }
            })
            .and_then(move |_| {
                db.send(GetParticipation {
                    user_id: user_id,
                    contest_id: contest_id,
                })
                .from_err()
                .and_then(|res| res)
            });
        Box::new(participation)
    }
}
