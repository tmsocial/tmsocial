use std::path::PathBuf;

use actix_web::error::ErrorNotFound;
use actix_web::http::header::ACCEPT_LANGUAGE;
use actix_web::HttpRequest;
use actix_web::{Error, Json};
use futures::Future;
use log::warn;

pub mod contest;
pub mod site;
pub mod user;

pub type AsyncJsonResponse<T> = Box<Future<Item = Json<T>, Error = Error>>;

fn get_path_tail<S>(req: &HttpRequest<S>) -> Result<String, Error> {
    let path = match req.match_info().get("tail") {
        Some("") => return Err(ErrorNotFound("No such asset")),
        // p starts with a / so we remove it
        Some(p) => p[1..].to_string(),
        None => return Err(ErrorNotFound("No such asset")),
    };
    if path.starts_with("/") {
        warn!("Malicious request detected: trying to access {:?}", path);
        return Err(ErrorNotFound("No such asset"));
    }
    Ok(path)
}

fn get_accept_languages<S>(req: &HttpRequest<S>) -> Vec<String> {
    let val = match req.headers().get(ACCEPT_LANGUAGE) {
        Some(val) => val.to_str(),
        None => return vec![],
    };
    match val {
        Ok(val) => accept_language::parse(val),
        _ => vec![],
    }
}

fn match_file(path: PathBuf, languages: &Vec<String>) -> Option<PathBuf> {
    let ext = match path.extension() {
        Some(ext) => match ext.to_str() {
            Some(ext) => ext,
            None => return None,
        },
        // nothing is touched if the extension is missing
        None => return Some(path),
    };
    for lang in languages {
        // this is a malicious request
        if !lang.chars().all(|c| c.is_alphanumeric() || c == '-') {
            warn!("Malicious request detected: using {:?} as a language", lang);
            return None;
        }
        let path = path.with_extension(&format!("{}.{}", lang, ext));
        if path.is_file() {
            return Some(path);
        }
    }
    if path.is_file() {
        return Some(path);
    }
    None
}
