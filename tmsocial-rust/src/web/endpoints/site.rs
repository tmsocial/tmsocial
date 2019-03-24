use std::env;
use std::path::{Path, PathBuf};

use actix_web::error::ErrorNotFound;
use actix_web::fs::NamedFile;
use actix_web::{Error, FromRequest, HttpRequest};
use futures::{future, Future};

use crate::models::Site;
use crate::web::endpoints::{get_accept_languages, get_path_tail, match_file};

pub fn handle_site_assets(
    req: &HttpRequest<crate::web::State>,
) -> Box<Future<Item = NamedFile, Error = Error>> {
    let site = Site::extract(req);
    let path = match get_path_tail(req) {
        Ok(path) => path,
        Err(e) => return Box::new(future::err(e)),
    };
    let languages = get_accept_languages(req);
    Box::new(site.and_then(move |site| {
        let storage_dir = PathBuf::new().join(Path::new(
            &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
        ));
        let path = storage_dir
            .join(Path::new("sites"))
            .join(Path::new(&site.id.to_string()))
            .join(&path);
        match match_file(path, &languages) {
            Some(path) => Ok(NamedFile::open(path)
                .map_err(|_e| ErrorNotFound("No such asset"))?),
            _ => Err(ErrorNotFound("No such asset")),
        }
    }))
}
