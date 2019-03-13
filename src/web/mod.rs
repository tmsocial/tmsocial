extern crate listenfd;

use std::net::IpAddr;
use std::path::PathBuf;

use actix::{Addr, Arbiter, SyncArbiter};
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
mod ws;

pub struct State {
    db: Addr<db::Executor>,
    event_manager: Addr<super::events::EventManager>,
}

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
    let event_manager = Arbiter::start(|_| super::events::EventManager::new());
    let mut app = App::with_state(State {
        db: db_addr.clone(),
        event_manager: event_manager.clone(),
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
    .resource("/api/events", |r| r.with(ws::events_handler))
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
    .resource("/api/contest/{contest_id}/task/{task_id}/submit", |r| {
        r.method(http::Method::POST)
            .with(endpoints::contest::submit)
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

pub mod test_utils {
    use std::path::PathBuf;

    use actix_web::client::{
        ClientRequest, ClientRequestBuilder, ClientResponse,
    };
    use actix_web::test::TestServer;
    use actix_web::{http, HttpMessage};
    use futures::future::Future;

    use crate::test_utils::FakeSite;

    use super::create_app;

    pub fn get_test_server() -> TestServer {
        TestServer::with_factory(|| create_app(&PathBuf::new().join("/tmp")))
    }

    pub fn fake_request(
        srv: &TestServer,
        site: &FakeSite,
        method: http::Method,
        path: &str,
    ) -> ClientRequestBuilder {
        let mut client = srv.client(method, path);
        client.set_header(
            "Host",
            http::header::HeaderValue::from_str(&site.site.domain)
                .expect("The domain is not valid"),
        );
        client
    }

    pub fn fake_response(
        srv: &mut TestServer,
        request: ClientRequest,
    ) -> ClientResponse {
        srv.execute(request.send()).unwrap()
    }

    pub fn get_json_body<T>(response: &ClientResponse) -> T
    where
        T: serde::de::DeserializeOwned,
    {
        let buf = response
            .body()
            .limit(1024 * 1024)
            .wait()
            .expect("Missing response body");
        let data = std::str::from_utf8(&buf[..]).expect("Non UTF8 response");

        serde_json::from_str(data).expect("Failed to extract json body")
    }

    pub fn json_request<T>(site: &FakeSite, path: &str) -> T
    where
        T: serde::de::DeserializeOwned,
    {
        let mut srv = get_test_server();
        let request = fake_request(&srv, site, http::Method::GET, path)
            .finish()
            .unwrap();
        let response = fake_response(&mut srv, request);
        assert!(response.status().is_success());
        get_json_body(&response)
    }
}
