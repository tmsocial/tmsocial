#![allow(proc_macro_derive_resolution_fallback)]

extern crate pretty_env_logger;
extern crate serde_json;
extern crate tmsocial;

use std::collections::HashSet;
use std::sync::{Arc, Mutex};

use actix::prelude::*;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};
use futures::future::{join_all, ok, Future};
use log::{error, info};

use tmsocial::models::*;

struct Eval(Addr<tmsocial::evaluation::Evaluator>);

impl Actor for Eval {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        use tmsocial::schema::submissions::dsl::*;
        let conn = tmsocial::establish_connection();

        let results = submissions
            .filter(status.eq(SubmissionStatus::Waiting))
            .load::<Submission>(&conn)
            .expect("Error loading submissions");

        info!("Found {} waiting submissions", results.len());
        let mut futs = vec![];
        for sub in results {
            futs.push(self.0.send(tmsocial::evaluation::Evaluate {
                user_id: 0,
                submission: sub,
                notify: ctx.address().recipient(),
            }));
        }

        let fut = join_all(futs)
            .and_then(|results| {
                for res in results {
                    if let Err(err) = res {
                        error!("{}", err);
                    }
                }
                System::current().stop();
                ok(())
            })
            .map_err(|e| panic!("{}", e));
        actix::spawn(fut);
    }
}

impl Handler<tmsocial::events::SubmissionUpdate> for Eval {
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
            &in_evaluation,
        )
    });
    let _eval = Eval(evaluator_addr).start();

    sys.run();
}
