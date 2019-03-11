use actix_web::{Error, Json};
use futures::Future;

pub mod contest;
pub mod user;

pub type AsyncJsonResponse<T> = Box<Future<Item = Json<T>, Error = Error>>;
