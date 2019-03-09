#![allow(proc_macro_derive_resolution_fallback)]

extern crate diesel;
extern crate serde_json;
extern crate tmsocial;

use std::env;
use std::fs::copy;
use std::path::Path;
use std::path::PathBuf;

use diesel::{Connection, ExpressionMethods, QueryDsl, RunQueryDsl};
use dotenv::dotenv;
use fs_extra::dir::create_all;
use structopt::StructOpt;

use tmsocial::models::*;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-submission")]
struct Opt {
    /// Task name of the task we should add the submission to.
    #[structopt(short = "t", long = "task")]
    task: Option<String>,
    /// Task id of the task we should add the submission to.
    #[structopt(short = "i", long = "task-id")]
    task_id: Option<i32>,
    /// Path of the files of the submission that should be added.
    #[structopt(name = "FILE", parse(from_os_str), required = true)]
    files: Vec<PathBuf>,
}

fn main() {
    use tmsocial::schema::tasks::dsl::*;
    let opt = Opt::from_args();
    dotenv().ok();

    let storage_dir = PathBuf::new().join(Path::new(
        &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
    ));
    let submission_dir = storage_dir.join(Path::new("submissions"));

    create_all(&submission_dir, false).unwrap();

    let conn = tmsocial::establish_connection();

    if opt.task.is_none() == opt.task_id.is_none() {
        panic!("You must specify exactly one of --task and --task-id");
    }

    let task_id = if let Some(task_id) = &opt.task_id {
        *task_id
    } else if let Some(task_name) = &opt.task {
        let results = tasks
            .filter(name.eq(&task_name))
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

    println!("Task id: {}", task_id);

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
    };

    conn.transaction(|| -> Result<(), diesel::result::Error> {
        use tmsocial::schema::submissions::dsl::*;
        let info = diesel::insert_into(submissions)
            .values(&submission_info)
            .get_result::<Submission>(&conn)?;
        println!("Adding submission with id {}", info.id);
        let path = submission_dir.join(Path::new(&info.id.to_string()));
        create_all(&path, true).unwrap();

        for file in opt.files {
            copy(&file, path.join(file.file_name().unwrap())).unwrap();
        }
        Ok(())
    })
    .unwrap();
}
