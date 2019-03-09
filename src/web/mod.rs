extern crate listenfd;

use actix::{Addr, SyncArbiter};
use actix_web::{fs, http, server, App, Result};
use failure::Error;
use listenfd::ListenFd;
use std::net::IpAddr;
use std::path::PathBuf;

mod db;
mod extractors;

fn hello_site_handler(site: extractors::Site) -> Result<String> {
    Ok(format!("Welcome to site with id {}", site.id))
}

struct State {
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
        .resource("/api/site", |r| {
            r.method(http::Method::GET).with(hello_site_handler)
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
