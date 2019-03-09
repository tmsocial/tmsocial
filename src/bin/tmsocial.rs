extern crate pretty_env_logger;

use tmsocial::web::web_main;

use dotenv::dotenv;
use failure::Error;
use std::net::IpAddr;
use std::path::PathBuf;
use structopt::StructOpt;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial")]
struct Opt {
    /// Path to the web root.
    #[structopt(
        short = "w",
        long = "web-root",
        default_value = "./web/",
        parse(from_os_str)
    )]
    web_root: PathBuf,
    /// Address to listen on.
    #[structopt(short = "l", long = "listen", default_value = "0.0.0.0")]
    address: IpAddr,
    /// Port to listen on.
    #[structopt(short = "p", long = "port", default_value = "8083")]
    port: u16,
}

fn main() -> Result<(), Error> {
    pretty_env_logger::init();
    let opt = Opt::from_args();
    dotenv().ok();

    web_main(opt.web_root, opt.address, opt.port)?;

    Ok(())
}
