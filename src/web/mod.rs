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
use serde_derive::{Deserialize, Serialize};

mod db;
mod endpoints;
mod extractors;
mod ws;

pub struct State {
    db: Addr<db::Executor>,
    event_manager: Addr<super::events::EventManager>,
}

#[derive(Serialize, Deserialize)]
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
    .handler("/api/assets", endpoints::site::handle_site_assets)
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

    use crate::models::User;
    use crate::test_utils::FakeSite;

    use super::create_app;
    use crate::web::extractors::AUTH_COOKIE;
    use actix_web::http::Cookie;

    pub struct TestRequestBuilder<'a, 'b> {
        pub site: &'a FakeSite,
        pub path: &'b str,
        pub method: http::Method,
        pub status: http::StatusCode,
        pub login_token: Option<String>,
    }

    impl<'a, 'b> TestRequestBuilder<'a, 'b> {
        pub fn new(
            site: &'a FakeSite,
            path: &'b str,
        ) -> TestRequestBuilder<'a, 'b> {
            TestRequestBuilder {
                site,
                path,
                method: http::Method::GET,
                status: http::StatusCode::OK,
                login_token: None,
            }
        }

        pub fn method(self: Self, method: http::Method) -> Self {
            TestRequestBuilder { method, ..self }
        }

        pub fn auth(self: Self, user: &User) -> Self {
            TestRequestBuilder {
                login_token: Some(
                    user.login_token.clone().expect("User without login token"),
                ),
                ..self
            }
        }

        pub fn status(self: Self, status: http::StatusCode) -> Self {
            TestRequestBuilder { status, ..self }
        }

        pub fn finish<T>(self: Self) -> T
        where
            T: serde::de::DeserializeOwned,
        {
            self.finish_with_response().0
        }

        pub fn finish_with_response<T>(self: Self) -> (T, ClientResponse)
        where
            T: serde::de::DeserializeOwned,
        {
            let mut srv = get_test_server();
            let mut request = fake_request(
                &srv,
                self.site,
                self.method,
                self.path,
                self.login_token,
            );
            let request = request.finish().unwrap();
            let response = fake_response(&mut srv, request);
            // will be printed only on errors
            println!("The response was: {:?}", response);
            assert_eq!(response.status(), self.status);
            (get_json_body(&response), response)
        }

        pub fn form<F, T>(self: Self, form: F) -> T
        where
            T: serde::de::DeserializeOwned,
            F: serde::Serialize,
        {
            self.form_with_response(form).0
        }

        pub fn form_with_response<F, T>(
            self: Self,
            form: F,
        ) -> (T, ClientResponse)
        where
            T: serde::de::DeserializeOwned,
            F: serde::Serialize,
        {
            let mut srv = get_test_server();
            let mut request = fake_request(
                &srv,
                self.site,
                self.method,
                self.path,
                self.login_token,
            );
            let request = request.form(form).unwrap();
            let response = fake_response(&mut srv, request);
            // will be printed only on errors
            println!("The response was: {:?}", response);
            assert_eq!(response.status(), self.status);
            (get_json_body(&response), response)
        }
    }

    fn get_test_server() -> TestServer {
        TestServer::with_factory(|| create_app(&PathBuf::new().join("/tmp")))
    }

    fn fake_request(
        srv: &TestServer,
        site: &FakeSite,
        method: http::Method,
        path: &str,
        login_token: Option<String>,
    ) -> ClientRequestBuilder {
        let mut client = srv.client(method, path);
        client.set_header(
            "Host",
            http::header::HeaderValue::from_str(&site.site.domain)
                .expect("The domain is not valid"),
        );
        if login_token.is_some() {
            client.cookie(
                Cookie::build(AUTH_COOKIE, login_token.unwrap())
                    .path("/")
                    .finish(),
            );
        }
        client
    }

    fn fake_response(
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
        // will be printed only on errors
        println!("The body was: '{}'", data);

        serde_json::from_str(data).expect("Failed to extract json body")
    }
}
