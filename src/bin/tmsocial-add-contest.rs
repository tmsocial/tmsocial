#![allow(proc_macro_derive_resolution_fallback)]

extern crate diesel;
extern crate tmsocial;

use diesel::{QueryDsl, RunQueryDsl};
use dotenv::dotenv;
use failure::Error;
use structopt::StructOpt;

use tmsocial::models::Contest;
use tmsocial::models::NewContest;
use tmsocial::models::Site;
use tmsocial::schema::contests::dsl::contests;
use tmsocial::schema::sites::dsl::sites;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-contest")]
struct Opt {
    /// Site id of the site we should add the contest to.
    #[structopt(short = "s", long = "site")]
    site_id: Option<i32>,
    /// Name of the contest to add.
    #[structopt(short = "n", long = "name")]
    name: String,
}

fn main() -> Result<(), Error> {
    let opt = Opt::from_args();
    dotenv().ok();

    let conn = tmsocial::establish_connection();
    let site = match opt.site_id {
        Some(id) => sites.find(id).first::<Site>(&conn)?,
        None => {
            let mut ids = sites.get_results::<Site>(&conn)?;
            match ids.len() {
                0 => panic!("No sites found"),
                1 => ids.swap_remove(0),
                _ => panic!("More than a site present, use -s option"),
            }
        }
    };

    let contest = NewContest {
        site_id: site.id,
        name: opt.name,
    };

    let info = diesel::insert_into(contests)
        .values(&contest)
        .get_result::<Contest>(&conn)?;
    println!(
        "Adding contest with id {:?} and to the site {}",
        info.id, site.id
    );

    Ok(())
}
