#![allow(proc_macro_derive_resolution_fallback)]

extern crate diesel;
extern crate pretty_env_logger;
extern crate serde_json;
extern crate tmsocial;

use std::env;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;

use diesel::{Connection, QueryDsl, RunQueryDsl};
use dotenv::dotenv;
use failure::Error;
use fs_extra::dir::{copy, create_all, CopyOptions};
use structopt::StructOpt;

use tmsocial::models::Contest;
use tmsocial::models::{NewSubtask, NewTask};
use tmsocial::models::{Task, TaskFormat};
use tmsocial::schema::contests::dsl::contests;
use tmsocial::task_maker_ui::TaskInfo;

#[derive(StructOpt, Debug)]
#[structopt(name = "tmsocial-add-task")]
struct Opt {
    /// Path of the task that should be added.
    #[structopt(name = "DIR", parse(from_os_str))]
    task: PathBuf,
    /// Contest id of the contest we should add the task to.
    #[structopt(short = "c", long = "contest-id")]
    contest_id: Option<i32>,
}

fn main() -> Result<(), Error> {
    use tmsocial::schema::subtasks::dsl::*;
    use tmsocial::schema::tasks::dsl::*;

    pretty_env_logger::init();
    let opt = Opt::from_args();
    dotenv().ok();

    let task_maker = env::var("TASK_MAKER").expect("TASK_MAKER must be set");
    let storage_dir = PathBuf::new().join(Path::new(
        &env::var("STORAGE_DIR").expect("STORAGE_DIR must be set"),
    ));
    let task_dir = storage_dir.join(Path::new("tasks"));

    create_all(&task_dir, false)?;

    let task_info = Command::new(task_maker)
        .arg("--ui=json")
        .arg("--task-info")
        .arg("--task-dir")
        .arg(&opt.task)
        .output()
        .unwrap();

    let task_info = task_info.stdout;
    let task_info = String::from_utf8(task_info)?;
    let task_info: TaskInfo = serde_json::from_str(&task_info)?;

    let conn = tmsocial::establish_connection();
    let contest = match opt.contest_id {
        Some(id) => contests.find(id).first::<Contest>(&conn)?,
        None => {
            let mut ids = contests.get_results::<Contest>(&conn)?;
            match ids.len() {
                0 => panic!("No contests found"),
                1 => ids.swap_remove(0),
                _ => panic!("More than a contest present, use -c option"),
            }
        }
    };

    let task = match &task_info {
        TaskInfo::IOITask(task) => NewTask {
            name: &task.name,
            title: &task.title,
            time_limit: task.time_limit.into(),
            memory_limit: task.memory_limit as i32,
            max_score: task
                .subtasks
                .iter()
                .map(|st| st.1.max_score as f64)
                .sum(),
            format: TaskFormat::IOI,
            contest_id: contest.id,
        },
        TaskInfo::TerryTask(task) => NewTask {
            name: &task.name,
            title: &task.title,
            time_limit: 10.0,
            memory_limit: 64 * 1024,
            max_score: task.max_score.into(),
            format: TaskFormat::Terry,
            contest_id: contest.id,
        },
    };

    conn.transaction(|| -> Result<(), diesel::result::Error> {
        // create the task
        let info = diesel::insert_into(tasks)
            .values(&task)
            .get_result::<Task>(&conn)?;
        println!(
            "Adding task with name {:?} and id {} to contest {} ({})",
            info.name, info.id, contest.id, contest.name
        );

        // build and create the subtasks
        let subs: Vec<NewSubtask> = match &task_info {
            TaskInfo::IOITask(task) => task
                .subtasks
                .iter()
                .map(|(st_num, subtask)| NewSubtask {
                    task_id: info.id,
                    num: *st_num,
                    max_score: subtask.max_score.into(),
                })
                .collect(),
            TaskInfo::TerryTask(task) => vec![NewSubtask {
                task_id: info.id,
                num: 0,
                max_score: task.max_score.into(),
            }],
        };
        let subtask_ids = diesel::insert_into(subtasks)
            .values(&subs)
            .returning(tmsocial::schema::subtasks::dsl::id)
            .get_results::<i32>(&conn)?;
        println!(
            "Added {} subtasks with ids {:?}",
            subtask_ids.len(),
            subtask_ids
        );

        // copy the task directory
        let path = task_dir.join(Path::new(&info.id.to_string()));
        let copy_options = CopyOptions {
            copy_inside: true,
            ..CopyOptions::new()
        };
        copy(opt.task, path, &copy_options).unwrap();

        // commit the transaction
        Ok(())
    })?;
    Ok(())
}
