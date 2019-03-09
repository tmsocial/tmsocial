extern crate listenfd;

use actix_web::{fs, server, App};
use failure::Error;
use listenfd::ListenFd;
use std::net::IpAddr;
use std::path::PathBuf;

mod db;

pub fn web_main(
    web_root: PathBuf,
    addr: IpAddr,
    port: u16,
) -> Result<(), Error> {
    let mut listenfd = ListenFd::from_env();
    let sys = actix::System::new("tmsocial");
    let mut server = server::new(move || {
        App::new()
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
