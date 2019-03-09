#![allow(proc_macro_derive_resolution_fallback)]

extern crate diesel;
extern crate tmsocial;

use diesel::{QueryDsl, RunQueryDsl};
use dotenv::dotenv;
use failure::Error;
use structopt::StructOpt;

use tmsocial::models::Contest;
use tmsocial::models::NewParticipation;
use tmsocial::models::Participation;
use tmsocial::models::User;
use tmsocial::schema::contests::dsl::contests;
use tmsocial::schema::participations::dsl::participations;
use tmsocial::schema::users::dsl::users;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-participation")]
struct Opt {
    /// Contest id of the contest we should add the participation to.
    #[structopt(short = "c", long = "contest-id")]
    contest_id: i32,
    /// User id of the user we should add the participation to.
    #[structopt(short = "u", long = "user-id")]
    user_id: i32,
}

fn main() -> Result<(), Error> {
    let opt = Opt::from_args();
    dotenv().ok();

    let conn = tmsocial::establish_connection();
    let contest = contests.find(opt.contest_id).first::<Contest>(&conn)?;
    let user = users.find(opt.user_id).first::<User>(&conn)?;

    let participation = NewParticipation {
        contest_id: contest.id,
        user_id: user.id,
    };

    let info = diesel::insert_into(participations)
        .values(&participation)
        .get_result::<Participation>(&conn)?;
    println!(
        "Adding participation with id {} and to the contest {} ({}) \
         and to the user {} ({})",
        info.id, contest.id, contest.name, user.id, user.username
    );

    Ok(())
}
