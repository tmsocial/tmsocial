#![allow(proc_macro_derive_resolution_fallback)]

extern crate pretty_env_logger;
extern crate serde_json;
extern crate tmsocial;

use std::collections::HashSet;
use std::sync::{Arc, Mutex};

use actix::prelude::*;
use futures::future::Future;
use log::info;

struct PrintMessageHandler;

impl Actor for PrintMessageHandler {
    type Context = Context<Self>;
}

impl Handler<tmsocial::events::SubmissionUpdate> for PrintMessageHandler {
    type Result = ();

    fn handle(
        &mut self,
        msg: tmsocial::events::SubmissionUpdate,
        _ctx: &mut Self::Context,
    ) {
        info!("{:?}", msg.event);
    }
}

fn main() {
    pretty_env_logger::init();
    dotenv::dotenv().ok();

    let sys = actix::System::new("tmsocial");
    let in_evaluation = Arc::new(Mutex::new(HashSet::<i32>::new()));
    let evaluator_addr = SyncArbiter::start(3, move || {
        tmsocial::evaluation::Evaluator::new(
            tmsocial::establish_connection(),
            Arc::clone(&in_evaluation),
        )
    });
    let check_pending =
        tmsocial::evaluation::CheckPending(evaluator_addr).start();
    let print_message_handler = PrintMessageHandler {}.start();

    actix::spawn(
        check_pending
            .send(tmsocial::evaluation::EvaluatePending(
                print_message_handler.recipient(),
            ))
            .then(|_| {
                actix::System::current().stop();
                futures::future::ok(())
            }),
    );

    sys.run();
}
