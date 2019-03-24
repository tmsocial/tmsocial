use super::Executor;
use crate::models::Task;
use actix::{Handler, Message};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::Error;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};

pub struct GetTask {
    pub id: i32,
    pub contest_id: i32,
}

pub struct GetTaskByContest {
    pub contest_id: i32,
}

impl Message for GetTask {
    type Result = Result<Task, Error>;
}

impl Handler<GetTask> for Executor {
    type Result = Result<Task, Error>;

    fn handle(&mut self, msg: GetTask, _: &mut Self::Context) -> Self::Result {
        let task = crate::schema::tasks::dsl::tasks
            .filter(crate::schema::tasks::columns::id.eq(&msg.id))
            .filter(
                crate::schema::tasks::columns::contest_id.eq(&msg.contest_id),
            )
            .first::<Task>(&self.0);
        match task {
            Ok(task) => Ok(task),
            Err(diesel::result::Error::NotFound) => {
                Err(ErrorNotFound(format!("No such task")))
            }
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}

impl Message for GetTaskByContest {
    type Result = Result<Vec<Task>, Error>;
}

impl Handler<GetTaskByContest> for Executor {
    type Result = Result<Vec<Task>, Error>;

    fn handle(
        &mut self,
        msg: GetTaskByContest,
        _: &mut Self::Context,
    ) -> Self::Result {
        let tasks = crate::schema::tasks::dsl::tasks
            .filter(
                crate::schema::tasks::columns::contest_id.eq(&msg.contest_id),
            )
            .get_results::<Task>(&self.0);
        match tasks {
            Ok(tasks) => Ok(tasks),
            Err(err) => Err(ErrorInternalServerError(err)),
        }
    }
}
