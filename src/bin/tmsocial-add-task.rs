#![allow(proc_macro_derive_resolution_fallback)]

#[macro_use]
extern crate diesel;
extern crate serde_json;
extern crate tmsocial;

use std::env;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;

use diesel::{Connection, RunQueryDsl};
use dotenv::dotenv;
use fs_extra::dir::{copy, create_all, CopyOptions};
use structopt::StructOpt;

use tmsocial::models::Task;
use tmsocial::models::TaskFormat;
use tmsocial::schema::tasks;
use tmsocial::task_maker_ui::TaskInfo;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-task")]
struct Opt {
    /// Path of the task that should be added.
    #[structopt(name = "DIR", parse(from_os_str))]
    task: PathBuf,
}

#[derive(Insertable, Debug)]
#[table_name = "tasks"]
struct NewTask {
    pub name: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i32,
    pub max_score: f64,
    pub format: TaskFormat,
}

fn main() {
    use tmsocial::schema::tasks::dsl::*;
    let opt = Opt::from_args();
    dotenv().ok();

    let task_maker = env::var("TASK_MAKER").expect("TASK_MAKER must be set");
    let task_dir = PathBuf::new().join(Path::new(
        &env::var("TASK_STORAGE_DIR").expect("TASK_STORAGE_DIR must be set"),
    ));

    create_all(&task_dir, false).unwrap();

    let task_info = Command::new(task_maker)
        .arg("--ui=json")
        .arg("--task-info")
        .arg("--task-dir")
        .arg(&opt.task)
        .output()
        .unwrap();

    let task_info = task_info.stdout;
    let task_info = String::from_utf8(task_info).unwrap();
    let task_info: TaskInfo = serde_json::from_str(&task_info).unwrap();

    let task_info = match task_info {
        TaskInfo::IOITask(task) => NewTask {
            name: task.name,
            title: task.title,
            time_limit: task.time_limit.into(),
            memory_limit: task.memory_limit as i32,
            max_score: task
                .subtasks
                .iter()
                .map(|st| st.1.max_score as f64)
                .sum(),
            format: TaskFormat::IOI,
        },
        TaskInfo::TerryTask(task) => NewTask {
            name: task.name,
            title: task.title,
            time_limit: 10.0,
            memory_limit: 64 * 1024,
            max_score: task.max_score.into(),
            format: TaskFormat::Terry,
        },
    };

    let conn = tmsocial::establish_connection();
    conn.transaction(|| -> Result<(), diesel::result::Error> {
        let info = diesel::insert_into(tasks)
            .values(&task_info)
            .get_result::<Task>(&conn)?;
        println!("Adding task with name {} and id {}", info.name, info.id);
        let path = task_dir.join(Path::new(&info.id.to_string()));
        let copy_options = CopyOptions {
            copy_inside: true,
            ..CopyOptions::new()
        };
        copy(opt.task, path, &copy_options).unwrap();
        Ok(())
    })
    .unwrap();
}
