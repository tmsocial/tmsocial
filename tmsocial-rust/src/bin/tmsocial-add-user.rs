#![allow(proc_macro_derive_resolution_fallback)]

extern crate diesel;
extern crate pretty_env_logger;
extern crate tmsocial;

use diesel::{QueryDsl, RunQueryDsl};
use dotenv::dotenv;
use failure::Error;
use structopt::StructOpt;

use tmsocial::models::NewUser;
use tmsocial::models::Site;
use tmsocial::models::User;
use tmsocial::schema::sites::dsl::sites;
use tmsocial::schema::users::dsl::users;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-user")]
struct Opt {
    /// Site id of the site we should add the user to.
    #[structopt(short = "s", long = "site")]
    site_id: Option<i32>,
    /// Username of the user to add.
    #[structopt(short = "u", long = "username")]
    username: String,
}

fn main() -> Result<(), Error> {
    pretty_env_logger::init();
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

    let user = NewUser {
        site_id: site.id,
        username: opt.username,
    };

    let info = diesel::insert_into(users)
        .values(&user)
        .get_result::<User>(&conn)?;
    println!(
        "Adding user with id {:?} and to the site {}",
        info.id, site.id
    );

    Ok(())
}
