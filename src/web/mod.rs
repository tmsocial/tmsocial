extern crate listenfd;

use std::net::IpAddr;
use std::path::PathBuf;

use actix::{Addr, SyncArbiter};
use actix_web::{fs, http, server, App, Result};
use failure::Error;
use listenfd::ListenFd;

use crate::models::*;

mod db;
mod endpoints;
mod extractors;

fn hello_site_handler(site: Site) -> Result<String> {
    Ok(format!("Welcome to site with id {}", site.id))
}

fn hello_participation_handler(
    user: User,
    contest: Contest,
    participation: Option<Participation>,
) -> Result<String> {
    Ok(format!(
        "Welcome {:?} {:?} {:?}",
        user, contest, participation
    ))
}

pub struct State {
    db: Addr<db::Executor>,
}

pub fn web_main(
    web_root: PathBuf,
    addr: IpAddr,
    port: u16,
) -> Result<(), Error> {
    let mut listenfd = ListenFd::from_env();
    let sys = actix::System::new("tmsocial");

    let db_addr = SyncArbiter::start(3, || {
        db::Executor::new(crate::establish_connection())
    });

    let mut server = server::new(move || {
        App::with_state(State {
            db: db_addr.clone(),
        })
        .route(
            "/api/contest/{contest_id}/hello",
            http::Method::GET,
            hello_participation_handler,
        )
        .resource("/api/site", |r| {
            r.method(http::Method::GET).with(hello_site_handler)
        })
        .resource("/api/user/{username}", |r| {
            r.method(http::Method::GET).with(endpoints::user::get_user)
        })
        .handler(
            "/",
            fs::StaticFiles::new(&web_root)
                .unwrap()
                .index_file("index.html"),
        )
        .finish()
    });
    server = if let Some(lfd) = listenfd.take_tcp_listener(0)? {
        server.listen(lfd)
    } else {
        server.bind((addr, port))?
    };
    server.start();
    println!("Started tmsocial");
    let _ = sys.run();
    Ok(())
}
