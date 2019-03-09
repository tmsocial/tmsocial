#![allow(proc_macro_derive_resolution_fallback)]

extern crate serde_json;
extern crate tmsocial;

use std::process::exit;

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
    let mut num_errors: i32 = 0;
    for sub in results {
        match tmsocial::evaluation::evaluate_submission(&conn, &sub) {
            Err(e) => {
                println!("Failed to evaluate submission {}: {:?}", sub.id, e);
                num_errors += 1;
            }
            Ok(_) => {}
        };
    }

    exit(num_errors);
}
