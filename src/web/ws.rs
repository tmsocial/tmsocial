use super::State;
use crate::events::*;
use actix::prelude::*;
use actix_web::{ws, Error, HttpRequest, HttpResponse};
use log::{error, warn};
use std::time::{Duration, Instant};

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

struct UserEventSession {
    id: usize,
    user_id: i32,
    hb: Instant,
}

impl Actor for UserEventSession {
    type Context = ws::WebsocketContext<Self, State>;
    fn started(&mut self, ctx: &mut Self::Context) {
        // Heartbeat handling
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                warn!("Websocket Client heartbeat failed, disconnecting!");
                ctx.state().event_manager.do_send(Disconnect {
                    session_id: act.id,
                    user_id: act.user_id,
                });
                ctx.stop();
                return;
            }
            ctx.ping("");
        });

        // Register with event manager and store session id.
        let addr = ctx.address();
        ctx.state()
            .event_manager
            .send(Connect {
                user_id: self.user_id,
                rcp: addr.recipient(),
            })
            .into_actor(self)
            .then(|res, act, ctx| {
                match res {
                    Ok(res) => act.id = res,
                    Err(e) => {
                        error!("Error registering client: {}", e);
                        ctx.stop()
                    }
                }
                fut::ok(())
            })
            .wait(ctx);
    }

    fn stopping(&mut self, ctx: &mut Self::Context) -> Running {
        ctx.state().event_manager.do_send(Disconnect {
            session_id: self.id,
            user_id: self.user_id,
        });
        Running::Stop
    }
}

impl Handler<Event> for UserEventSession {
    type Result = ();

    fn handle(&mut self, msg: Event, ctx: &mut Self::Context) {
        let json = serde_json::to_string(&msg);
        match json {
            Ok(js) => ctx.text(js),
            Err(e) => error!("Error during serialization: {}", e),
        }
    }
}

impl StreamHandler<ws::Message, ws::ProtocolError> for UserEventSession {
    fn handle(&mut self, msg: ws::Message, ctx: &mut Self::Context) {
        println!("WEBSOCKET MESSAGE: {:?}", msg);
        match msg {
            ws::Message::Ping(msg) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
            }
            ws::Message::Pong(_) => {
                self.hb = Instant::now();
            }
            ws::Message::Text(text) => {
                warn!("Unexpected text from client: {}", text)
            }
            ws::Message::Binary(bin) => {
                warn!("Unexpected binary from client: {:?}", bin)
            }
            ws::Message::Close(_) => {
                ctx.stop();
            }
        }
    }
}

pub fn events_handler(
    req: HttpRequest<State>,
    user: crate::models::User,
) -> Result<HttpResponse, Error> {
    ws::start(
        &req,
        UserEventSession {
            id: 0,
            user_id: user.id,
            hb: Instant::now(),
        },
    )
}
