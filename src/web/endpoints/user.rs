use actix_web::AsyncResponder;
use actix_web::Error;
use actix_web::Json;
use actix_web::{Path, State};
use futures::future::result;
use futures::future::Future;

use crate::models::*;
use crate::web::db::user::GetUserByUsername;

pub fn get_user(
    state: State<crate::web::State>,
    site: Site,
    id: Path<String>,
) -> Box<Future<Item = Json<User>, Error = Error>> {
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
