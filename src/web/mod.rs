use actix_web::{fs, server, App};
use failure::Error;
use std::net::IpAddr;
use std::path::PathBuf;

mod db;

pub fn web_main(
    web_root: PathBuf,
    addr: IpAddr,
    port: u16,
) -> Result<(), Error> {
    let sys = actix::System::new("tmsocial");
    server::new(move || {
        App::new()
            .handler(
                "/",
                fs::StaticFiles::new(&web_root)
                    .unwrap()
                    .index_file("index.html"),
            )
            .finish()
    })
    .bind((addr, port))?
    .start();
    println!("Started tmsocial");
    let _ = sys.run();
    Ok(())
}
