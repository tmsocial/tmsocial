use actix_web::http::Cookie;
use actix_web::AsyncResponder;
use actix_web::Error;
use actix_web::Form;
use actix_web::HttpResponse;
use actix_web::Json;
use actix_web::{Path, State};
use futures::future::result;
use futures::future::Future;
use serde_derive::{Deserialize, Serialize};

use crate::models::*;
use crate::web::db::user::DoLogin;
use crate::web::db::user::GetUserByUsername;
use crate::web::endpoints::AsyncJsonResponse;
use crate::web::extractors::AUTH_COOKIE;

#[derive(Serialize, Deserialize)]
pub struct LoginForm {
    pub username: String,
}

pub fn login(
    state: State<crate::web::State>,
    site: Site,
    form: Form<LoginForm>,
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    Box::new(
        state
            .db
            .send(DoLogin {
                site_id: site.id,
                username: form.username.clone(),
            })
            .from_err()
            .and_then(|res| {
                result(res.map(|(user, token)| {
                    HttpResponse::Ok()
                        .cookie(
                            Cookie::build(AUTH_COOKIE, token)
                                .path("/")
                                .finish(),
                        )
                        .content_type("application/json")
                        .body(
                            serde_json::to_string(&user)
                                .unwrap_or("nope".to_string()),
                        )
                }))
                .responder()
            }),
    )
}

pub fn get_user(
    state: State<crate::web::State>,
    site: Site,
    id: Path<String>,
) -> AsyncJsonResponse<User> {
    Box::new(
        state
            .db
            .send(GetUserByUsername {
                site_id: site.id,
                username: id.clone(),
            })
            .from_err()
            .and_then(|res| result(res.map(|u| Json(u))).responder()),
    )
}

#[cfg(test)]
mod tests {
    use actix_web::client::ClientResponse;
    use actix_web::http::StatusCode;
    use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

    use crate::models::*;
    use crate::test_utils::*;
    use crate::web::extractors::AUTH_COOKIE;
    use crate::web::test_utils::*;
    use crate::web::ErrorResponse;

    use super::LoginForm;

    #[test]
    fn login() {
        let site = FakeSite::new();
        let user = site.user("username");
        let (u, res): (User, ClientResponse) =
            TestRequestBuilder::new(&site, "/api/login")
                .method(actix_web::http::Method::POST)
                .form_with_response(LoginForm {
                    username: user.username,
                });
        assert_eq!(u.id, user.id);
        assert_eq!(
            res.cookie(AUTH_COOKIE).expect("Cookie not set").value(),
            user.login_token.expect("No login token in the user")
        );
        assert_eq!(u.login_token, None);
    }

    #[test]
    fn login_new_user() {
        let site = FakeSite::new();
        let user = site.user("username");
        // remove the login token from the db
        diesel::update(crate::schema::users::dsl::users)
            .set(crate::schema::users::dsl::login_token.eq(None::<String>))
            .filter(crate::schema::users::dsl::id.eq(&user.id))
            .execute(&site.conn)
            .expect("Cannot remove login token");
        // this will repopulate the login_token field on the db
        let (u, res): (User, ClientResponse) =
            TestRequestBuilder::new(&site, "/api/login")
                .method(actix_web::http::Method::POST)
                .form_with_response(LoginForm {
                    username: user.username,
                });
        // fetch the new token from the db
        let login_token = crate::schema::users::dsl::users
            .find(&user.id)
            .select(crate::schema::users::dsl::login_token)
            .first::<Option<String>>(&site.conn)
            .expect("Where is the user?");
        assert_eq!(u.id, user.id);
        assert_eq!(
            res.cookie(AUTH_COOKIE).expect("Cookie not set").value(),
            login_token.expect("No login token in the user")
        );
        assert_eq!(u.login_token, None);
    }

    #[test]
    fn login_bad_username() {
        let site = FakeSite::new();
        let (err, res): (ErrorResponse, ClientResponse) =
            TestRequestBuilder::new(&site, "/api/login")
                .method(actix_web::http::Method::POST)
                .status(StatusCode::NOT_FOUND)
                .form_with_response(LoginForm {
                    username: "not the right username".to_string(),
                });
        assert!(res.cookie(AUTH_COOKIE).is_none());
        assert_eq!(err.error, "Login failed");
    }

    #[test]
    fn login_wrong_site() {
        let site = FakeSite::new();
        let site2 = FakeSite::new();
        site2.user("username");
        let (err, res): (ErrorResponse, ClientResponse) =
            TestRequestBuilder::new(&site, "/api/login")
                .method(actix_web::http::Method::POST)
                .status(StatusCode::NOT_FOUND)
                .form_with_response(LoginForm {
                    username: "username".to_string(),
                });
        assert!(res.cookie(AUTH_COOKIE).is_none());
        assert_eq!(err.error, "Login failed");
    }

    #[test]
    fn get_user() {
        let site = FakeSite::new();
        let user = site.user("username");
        let res: User =
            TestRequestBuilder::new(&site, "/api/user/username").finish();
        assert_eq!(res.id, user.id);
    }

    #[test]
    fn get_user_not_found() {
        let site = FakeSite::new();
        TestRequestBuilder::new(&site, "/api/user/username")
            .status(StatusCode::NOT_FOUND)
            .finish::<ErrorResponse>();
    }

    #[test]
    fn get_user_wrong_site() {
        let site = FakeSite::new();
        let site2 = FakeSite::new();
        site2.user("username");
        TestRequestBuilder::new(&site, "/api/user/username")
            .status(StatusCode::NOT_FOUND)
            .finish::<ErrorResponse>();
    }
}
