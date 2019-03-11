extern crate listenfd;

use std::net::IpAddr;
use std::path::PathBuf;

use actix::{Addr, SyncArbiter};
use actix_web::http::header::HeaderValue;
use actix_web::middleware::{ErrorHandlers, Response};
use actix_web::{
    fs, http, middleware, server, App, HttpRequest, HttpResponse, Result,
};
use failure::Error;
use listenfd::ListenFd;
use serde_derive::Serialize;

mod db;
mod endpoints;
mod extractors;

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

fn render_error<S>(
    _: &HttpRequest<S>,
    mut resp: HttpResponse,
) -> Result<Response> {
    let error = resp
        .error()
        .map(|e| e.to_string())
        .unwrap_or("".to_string());
    resp.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    resp.set_body(serde_json::to_string(&ErrorResponse { error }).unwrap());
    Ok(Response::Done(resp))
}

pub struct State {
    db: Addr<db::Executor>,
}

pub fn create_app(web_root: &PathBuf) -> App<State> {
    // bind all this error handlers
    let error_codes = vec![
        http::StatusCode::BAD_REQUEST,
        http::StatusCode::UNAUTHORIZED,
        http::StatusCode::FORBIDDEN,
        http::StatusCode::NOT_FOUND,
        http::StatusCode::UNPROCESSABLE_ENTITY,
        http::StatusCode::INTERNAL_SERVER_ERROR,
    ];

    let db_addr = SyncArbiter::start(3, || {
        db::Executor::new(crate::establish_connection())
    });
    let mut app = App::with_state(State {
        db: db_addr.clone(),
    })
    .middleware(middleware::Logger::default());
    for error_code in error_codes {
        app = app
            .middleware(ErrorHandlers::new().handler(error_code, render_error));
    }

    app.resource("/api/login", |r| {
        r.method(http::Method::POST).with(endpoints::user::login)
    })
    .resource("/api/user/{username}", |r| {
        r.method(http::Method::GET).with(endpoints::user::get_user)
    })
    .resource("/api/contests", |r| {
        r.method(http::Method::GET)
            .with(endpoints::contest::get_contests)
    })
    .resource("/api/contest/{contest_id}", |r| {
        r.method(http::Method::GET)
            .with(endpoints::contest::get_contest)
    })
    .resource("/api/contest/{contest_id}/join", |r| {
        r.method(http::Method::POST)
            .with(endpoints::contest::join_contest)
    })
    .resource("/api/contest/{contest_id}/task/{task_id}", |r| {
        r.method(http::Method::GET)
            .with(endpoints::contest::get_task)
    })
    .resource(
        "/api/contest/{contest_id}/task/{task_id}/submissions",
        |r| {
            r.method(http::Method::GET)
                .with(endpoints::contest::get_submissions)
        },
    )
    .resource(
        "/api/contest/{contest_id}/task/{task_id}/submission/{submission_id}",
        |r| {
            r.method(http::Method::GET)
                .with(endpoints::contest::get_submission)
        },
    )
    .handler(
        "/",
        fs::StaticFiles::new(&web_root)
            .unwrap()
            .index_file("index.html"),
    )
}

pub fn web_main(
    web_root: PathBuf,
    addr: IpAddr,
    port: u16,
) -> Result<(), Error> {
    let mut listenfd = ListenFd::from_env();
    let sys = actix::System::new("tmsocial");

    let mut server = server::new(move || create_app(&web_root).finish());
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
