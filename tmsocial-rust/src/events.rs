use actix::prelude::*;
use actix_derive::Message;
use log::{debug, error, info};
use rand::rngs::ThreadRng;
use rand::Rng;
use serde_derive::Serialize;
use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};

/// How long events are kept.
const HISTORY_DURATION: Duration = Duration::from_secs(300);

#[derive(Serialize, Debug, Clone)]
pub enum SubmissionStatus {
    Started,
    Compiled {
        compiler_stderr: String,
        success: bool,
    },
    TestcaseScored {
        subtask_num: i32,
        testcase_num: i32,
        score: f64,
        message: String,
        time: f64,
        memory: u64,
    },
    SubtaskScored {
        subtask_num: i32,
        score: f64,
    },
    Done {
        score: f64,
    },
    Error {
        message: String,
    },
}

#[derive(Message, Serialize, Debug, Clone)]
pub struct Event {
    pub submission_id: i32,
    pub update_id: i32,
    pub status: SubmissionStatus,
}

#[derive(Message, Debug)]
pub struct SubmissionUpdate {
    pub user_id: i32,
    pub event: Event,
}

#[derive(Message)]
#[rtype(usize)]
pub struct Connect {
    pub user_id: i32,
    pub rcp: Recipient<Event>,
}

#[derive(Message)]
pub struct Disconnect {
    pub user_id: i32,
    pub session_id: usize,
}

pub struct EventManager {
    // user_id to (session_id to handler).
    sessions: HashMap<i32, HashMap<usize, Recipient<Event>>>,
    // enqueued events: user_id to deque (timestamp, event).
    events: HashMap<i32, VecDeque<(Instant, Event)>>,
    rng: ThreadRng,
}

impl EventManager {
    pub fn new() -> EventManager {
        EventManager {
            sessions: HashMap::new(),
            events: HashMap::new(),
            rng: rand::thread_rng(),
        }
    }

    fn cleanup(&mut self) {
        info!("Starting cleanup of old events");
        let now = Instant::now();
        let mut to_erase = vec![];
        for (uid, evts) in self.events.iter_mut() {
            loop {
                let evt = evts.get(0);
                if evt.is_none() {
                    to_erase.push(*uid);
                    break;
                }
                let evt = evt.unwrap();
                if now.duration_since(evt.0) > HISTORY_DURATION {
                    evts.pop_front();
                } else {
                    break;
                }
            }
        }
        for uid in to_erase {
            self.events.remove(&uid);
        }
    }
}

impl Actor for EventManager {
    type Context = Context<Self>;

    /// Method is called on actor start.
    fn started(&mut self, ctx: &mut Self::Context) {
        ctx.run_interval(HISTORY_DURATION, |act, _| {
            act.cleanup();
        });
    }
}

impl Handler<Connect> for EventManager {
    type Result = usize;
    fn handle(&mut self, msg: Connect, _: &mut Context<Self>) -> Self::Result {
        let id = self.rng.gen::<usize>();
        info!("User {} started websocket session {}", msg.user_id, id);

        // Register session
        if !self.sessions.contains_key(&msg.user_id) {
            self.sessions.insert(msg.user_id, HashMap::new());
        }
        let user_sessions = self.sessions.get_mut(&msg.user_id).unwrap();
        user_sessions.insert(id, msg.rcp.clone());

        // Send waiting events
        let user_events = self.events.get(&msg.user_id);
        if let Some(events) = user_events {
            for evt in events {
                let result = msg.rcp.do_send(evt.1.clone());
                if let Err(error) = result {
                    error!("{}", error);
                }
            }
        }

        // Return session id
        id
    }
}

impl Handler<Disconnect> for EventManager {
    type Result = ();
    fn handle(
        &mut self,
        msg: Disconnect,
        _: &mut Context<Self>,
    ) -> Self::Result {
        info!(
            "User {} closed websocket session {}",
            msg.user_id, msg.session_id
        );
        let user_sessions = self.sessions.get_mut(&msg.user_id);
        let mut no_session = false;
        if let Some(sessions) = user_sessions {
            if sessions.remove(&msg.session_id).is_none() {
                no_session = true;
            }
        } else {
            no_session = true;
        }
        if no_session {
            error!(
                "User {} does not have session {}!",
                msg.user_id, msg.session_id
            );
        }
    }
}

impl Handler<SubmissionUpdate> for EventManager {
    type Result = ();
    fn handle(
        &mut self,
        msg: SubmissionUpdate,
        _: &mut Context<Self>,
    ) -> Self::Result {
        info!("Event received for user {}", msg.user_id);
        debug!("Event: {:?}", msg);
        // Send event to connected sessions
        let user_sessions = self.sessions.get(&msg.user_id);
        if let Some(sessions) = user_sessions {
            for session in sessions.values() {
                let result = session.do_send(msg.event.clone());
                if let Err(error) = result {
                    error!("{}", error);
                }
            }
        }

        // Save event in queue
        if !self.events.contains_key(&msg.user_id) {
            self.events.insert(msg.user_id, VecDeque::new());
        }
        let user_events = self.events.get_mut(&msg.user_id).unwrap();
        user_events.push_back((Instant::now(), msg.event));
    }
}
