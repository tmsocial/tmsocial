use super::db::GetSiteId;
use super::State;
use actix_web::http::header::HOST;
use actix_web::{Error, FromRequest, HttpRequest};
use futures::Future;
use log::warn;
use url::Url;

pub struct Site {
    pub id: i32,
}

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
                "localhost"
            }
        };
        let host = Url::parse(host);
        let host = if let Ok(host) = host {
            String::from(host.host_str().unwrap_or("localhost"))
        } else {
            warn!("Invalid host header: {:?}", host);
            String::from("localhost")
        };

        Box::new(
            req.state()
                .db
                .send(GetSiteId { host: host })
                .from_err()
                .and_then(|res| match res {
                    Ok(id) => Ok(Site { id: id }),
                    Err(e) => Err(e),
                }),
        )
    }
}
