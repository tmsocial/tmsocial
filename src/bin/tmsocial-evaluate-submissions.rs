#![allow(proc_macro_derive_resolution_fallback)]

extern crate serde_json;
extern crate tmsocial;

use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};
use tmsocial::models::*;

fn main() {
    use tmsocial::schema::submissions::dsl::*;
    dotenv::dotenv().ok();

    let conn = tmsocial::establish_connection();

    let results = submissions
        .filter(status.eq(SubmissionStatus::Waiting))
        .load::<Submission>(&conn)
        .expect("Error loading submissions");

    println!("Found {} waiting submissions", results.len());
    for sub in results {
        tmsocial::evaluate_submission(&conn, &sub).unwrap();
    }
}
