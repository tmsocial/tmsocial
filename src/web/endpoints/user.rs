use actix_web::http::Cookie;
use actix_web::AsyncResponder;
use actix_web::Error;
use actix_web::Form;
use actix_web::HttpResponse;
use actix_web::Json;
use actix_web::{Path, State};
use futures::future::result;
use futures::future::Future;
use serde_derive::Deserialize;

use crate::models::*;
use crate::web::db::user::DoLogin;
use crate::web::db::user::GetUserByUsername;
use crate::web::endpoints::AsyncJsonResponse;
use crate::web::extractors::AUTH_COOKIE;

#[derive(Deserialize)]
pub struct LoginForm {
    pub username: String,
}

pub fn login(
    state: State<crate::web::State>,
    site: Site,
    form: Form<LoginForm>,
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    Box::new(
        state
            .db
            .send(DoLogin {
                site_id: site.id,
                username: form.username.clone(),
            })
            .from_err()
            .and_then(|res| {
                result(res.map(|(user, token)| {
                    HttpResponse::Ok()
                        .cookie(
                            Cookie::build(AUTH_COOKIE, token)
                                .path("/")
                                .finish(),
                        )
                        .content_type("application/json")
                        .body(
                            serde_json::to_string(&user)
                                .unwrap_or("nope".to_string()),
                        )
                }))
                .responder()
            }),
    )
}

pub fn get_user(
    state: State<crate::web::State>,
    site: Site,
    id: Path<String>,
) -> AsyncJsonResponse<User> {
    Box::new(
        state
            .db
            .send(GetUserByUsername {
                site_id: site.id,
                username: id.clone(),
            })
            .from_err()
            .and_then(|res| result(res.map(|u| Json(u))).responder()),
    )
}
