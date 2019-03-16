use std::env;
use std::path::{Path, PathBuf};

use actix_web::error::ErrorNotFound;
use actix_web::fs::NamedFile;
use actix_web::{Error, FromRequest, HttpRequest};
use futures::{future, Future};

use crate::models::Site;

pub fn handle_site_assets(
    req: &HttpRequest<crate::web::State>,
) -> Box<Future<Item = NamedFile, Error = Error>> {
    let site = Site::extract(req);
    let path = match req.match_info().get("tail") {
        Some("") => {
            return Box::new(future::err(ErrorNotFound("No such asset")))
        }
        // p starts with a / so we remove it
        Some(p) => p[1..].to_string(),
        None => return Box::new(future::err(ErrorNotFound("No such asset"))),
    };
    Box::new(site.and_then(move |site| {
        let storage_dir = PathBuf::new().join(Path::new(
            &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
        ));
        let path = storage_dir
            .join(Path::new("sites"))
            .join(Path::new(&site.id.to_string()))
            .join(&path);
        Ok(NamedFile::open(path)
            .map_err(|_e| ErrorNotFound("No such asset"))?)
    }))
}
