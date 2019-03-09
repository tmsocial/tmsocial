#![allow(proc_macro_derive_resolution_fallback)]

extern crate diesel;
extern crate tmsocial;

use diesel::RunQueryDsl;
use dotenv::dotenv;
use failure::Error;
use structopt::StructOpt;

use tmsocial::models::NewSite;
use tmsocial::models::Site;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-site")]
struct Opt {
    /// Domain of the new site to create.
    #[structopt(short = "d", long = "domain")]
    domain: String,
}

fn main() -> Result<(), Error> {
    use tmsocial::schema::sites::dsl::*;

    let opt = Opt::from_args();
    dotenv().ok();

    let conn = tmsocial::establish_connection();
    let site = NewSite { domain: opt.domain };

    let info = diesel::insert_into(sites)
        .values(&site)
        .get_result::<Site>(&conn)?;
    println!(
        "Adding site with domain {:?} and id {}",
        info.domain, info.id
    );

    Ok(())
}
