use actix_web::AsyncResponder;
use actix_web::Error;
use actix_web::Json;
use actix_web::State;
use futures::future::result;
use futures::future::Future;

use crate::models::*;
use crate::web::db::contest::GetContests;

pub fn get_contests(
    state: State<crate::web::State>,
    site: Site,
) -> Box<Future<Item = Json<Vec<Contest>>, Error = Error>> {
    // TODO mark somehow the contests the user has joined
    Box::new(
        state
            .db
            .send(GetContests { site_id: site.id })
            .from_err()
            .and_then(|res| result(res.map(|u| Json(u))).responder()),
    )
}
