use super::db::GetSite;
use super::State;
use actix_web::error::{ErrorBadRequest, ErrorInternalServerError};
use actix_web::http::header::HOST;
use actix_web::{Error, FromRequest, HttpRequest};
use futures::{future, Future};
use log::warn;
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

impl FromRequest<State> for User {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        _req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        Box::new(future::err(ErrorInternalServerError("Not implemented yet")))
    }
}

impl FromRequest<State> for Contest {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        _req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        Box::new(future::err(ErrorInternalServerError("Not implemented yet")))
    }
}

impl FromRequest<State> for Participation {
    type Config = ();
    type Result = Box<Future<Item = Self, Error = Error>>;
    fn from_request(
        _req: &HttpRequest<State>,
        _cfg: &Self::Config,
    ) -> Self::Result {
        Box::new(future::err(ErrorInternalServerError("Not implemented yet")))
    }
}
