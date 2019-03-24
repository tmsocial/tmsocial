#![allow(proc_macro_derive_resolution_fallback)]

extern crate diesel;
extern crate pretty_env_logger;
extern crate serde_json;
extern crate tmsocial;

use std::fs::copy;
use std::path::Path;
use std::path::PathBuf;

use diesel::{Connection, ExpressionMethods, QueryDsl, RunQueryDsl};
use dotenv::dotenv;
use structopt::StructOpt;

use tmsocial::create_submission_dir;
use tmsocial::models::*;
use tmsocial::schema::participations::dsl::participations;
use tmsocial::schema::tasks::dsl::tasks;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-submission")]
struct Opt {
    /// Task name of the task we should add the submission to.
    #[structopt(short = "t", long = "task")]
    task: Option<String>,
    /// Task id of the task we should add the submission to.
    #[structopt(short = "i", long = "task-id")]
    task_id: Option<i32>,
    /// User id of the user we should add the submission to.
    #[structopt(short = "u", long = "user-id")]
    user_id: i32,
    /// Path of the files of the submission that should be added.
    #[structopt(name = "FILE", parse(from_os_str), required = true)]
    files: Vec<PathBuf>,
}

fn main() {
    pretty_env_logger::init();
    let opt = Opt::from_args();
    dotenv().ok();

    let conn = tmsocial::establish_connection();

    if opt.task.is_none() == opt.task_id.is_none() {
        panic!("You must specify exactly one of --task and --task-id");
    }

    let task_id = if let Some(task_id) = &opt.task_id {
        *task_id
    } else if let Some(task_name) = &opt.task {
        let results = tasks
            .filter(tmsocial::schema::tasks::name.eq(&task_name))
            .load::<Task>(&conn)
            .expect("Error loading task");
        if results.len() == 0 {
            panic!("No task with name {}!", task_name);
        }
        if results.len() > 1 {
            panic!("More than one task with name {}!", task_name);
        }
        results[0].id
    } else {
        panic!("True is false")
    };

    let task = tasks
        .find(task_id)
        .first::<Task>(&conn)
        .expect("No such task");

    let participation = participations
        .filter(
            tmsocial::schema::participations::contest_id.eq(task.contest_id),
        )
        .filter(tmsocial::schema::participations::user_id.eq(opt.user_id))
        .first::<Participation>(&conn)
        .expect("No such participation");

    println!("Task: {:?}", task);

    let mut submission_files = vec![];

    for file in &opt.files {
        submission_files.push(
            Path::new(file)
                .file_name()
                .expect("A file is needed")
                .to_str()
                .unwrap()
                .to_string(),
        );
    }

    println!("Files: {}", submission_files.join(", "));

    let submission_info = NewSubmission {
        task_id: task_id,
        files: submission_files,
        participation_id: participation.id,
    };

    conn.transaction(|| -> Result<(), diesel::result::Error> {
        use tmsocial::schema::submissions::dsl::*;
        let info = diesel::insert_into(submissions)
            .values(&submission_info)
            .get_result::<Submission>(&conn)?;
        println!("Adding submission with id {}", info.id);
        let path = create_submission_dir(info.id);

        for file in opt.files {
            copy(&file, path.join(file.file_name().unwrap())).unwrap();
        }
        Ok(())
    })
    .unwrap();
}
