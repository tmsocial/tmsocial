import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { DateTime } from "luxon";
import { join } from "path";
import { fromEvent } from "rxjs";
import { first } from "rxjs/operators";
import { Tail } from "tail";
import { spawn, execFile, execFileSync } from "child_process";
import { EventEmitter } from "events";

interface SubmissionFileInput {
  field: string
  type: string
  content_base64: string
}

interface Node {
  id: string,
  path: string,
}

const CONFIG_DIRECTORY = '../test_site/config';
const DATA_DIRECTORY = '../test_site/data';

async function loadEmptyConfig(id: string, path: string): Promise<Node> {
  return { id, path };
}

async function loadNode(root: string, id: string, path: string): Promise<Node | null> {
  let file;
  try {
    file = readFileSync(join(root, path, 'data.json'), 'utf8');
  } catch (e) {
    console.log(e);
    return null;
  }

  const content = JSON.parse(file);
  return {
    id,
    path,
    ...content,
  };
}

async function loadConfig(id: string, path: string): Promise<any> {
  return await loadNode(CONFIG_DIRECTORY, id, path);
}

async function loadData(id: string, path: string): Promise<any> {
  return await loadNode(DATA_DIRECTORY, id, path);
}

export const resolvers = {
  Query: {
    async site(obj: unknown, { id }: { id: string }) {
      const [site] = id.split("/");
      return await loadEmptyConfig(id, join(site));
    },
    async user(obj: unknown, { id }: { id: string }) {
      const [site, user] = id.split("/");
      return await loadConfig(`${site}/${user}`, join(site, 'users', user));
    },
    async contest(obj: unknown, { id }: { id: string }) {
      const [site, contest] = id.split("/");
      return await loadConfig(`${site}/${contest}`, join(site, 'contests', contest));
    },
    async task(obj: unknown, { id }: { id: string }) {
      const [site, contest, task] = id.split("/");
      return await loadEmptyConfig(`${site}/${contest}/${task}`, join(site, 'contests', contest, 'tasks', task));
    },
    async submission(obj: unknown, { id }: { id: string }) {
      const [site, contest, user, task, submission] = id.split("/");
      return await loadEmptyConfig(
        `${site}/${contest}/${user}/${task}/${submission}`, 
        join(site, 'contests', contest, 'participations', user, 'tasks', task, 'submissions', submission),
      );
    },
    async evaluation(obj: unknown, { id }: { id: string }) {
      const [site, contest, user, task, submission, evaluation] = id.split("/");
      return await loadEmptyConfig(
        `${site}/${contest}/${user}/${task}/${submission}/${evaluation}`, 
        join(site, 'contests', contest, 'participations', user, 'tasks', task, 'submissions', submission, 'evalutions', evaluation),
      );
    },
  },
  Site: {
    async default_contest({ id, path }: Node) {
      return await loadConfig(`${id}/default`, join(path, 'contests/default'));
    },
  },
  Contest: {
    async tasks({ id, path }: Node) {
      const dir = readdirSync(join(CONFIG_DIRECTORY, path, 'tasks'));
      return await Promise.all(dir.map(task => loadEmptyConfig(`${id}/${task}`, join(path, 'tasks', task))));
    },
  },
  Submission: {
    async official_evaluation({ id, path }: Node) {
      const dir = readdirSync(join(DATA_DIRECTORY, path, 'evaluations')).sort();
      const evaluation = dir[dir.length - 1];
      return await loadEmptyConfig(`${id}/${evaluation}`, join(path, "evaluations", evaluation));
    }
  },
  Mutation: {
    async submit(root: any, { task_id, user_id, files }: { task_id: string, user_id: string, files: SubmissionFileInput[] }) {
      const [site, contest, task] = task_id.split("/");
      const [site2, user] = user_id.split("/");

      if (site !== site2) {
        throw new Error("cannot submit for a different site");
      }

      const submission = DateTime.utc().toISO();

      const submissionPath = join(
        site,
        "contests",
        contest,
        "participations",
        user,
        "tasks",
        task,
        "submissions",
        submission,
      );

      mkdirSync(join(DATA_DIRECTORY, submissionPath), { recursive: true });
      writeFileSync(join(DATA_DIRECTORY, submissionPath, "data.json"), JSON.stringify({
        timestamp: submission,
      }), {
        encoding: 'utf8',
      })

      mkdirSync(join(DATA_DIRECTORY, submissionPath, "files"), { recursive: true });

      files.forEach(({ field, type, content_base64 }) => {
        writeFileSync(join(DATA_DIRECTORY, submissionPath, 'files', `${field}.${type}`), Buffer.from(content_base64, 'base64'));
      })

      const evaluation = DateTime.utc().toISO();
      mkdirSync(join(DATA_DIRECTORY, submissionPath, 'evaluations', evaluation), { recursive: true });

      console.log("Starting evaluation...");
      const process = execFileSync("../task_maker_wrapper/adapter.py", [
        join(CONFIG_DIRECTORY, site, 'contests', contest, 'tasks', task),
        join(DATA_DIRECTORY, submissionPath),
        join(DATA_DIRECTORY, submissionPath, 'evaluations', evaluation),
      ])

      execFile("echo", [ "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX" ]);

      return await loadData(`${site}/${contest}/${user}/${task}/${submission}`, submissionPath);
    }
  },
  Subscription: {
    evaluation_events: {
      async * subscribe(obj: any, { evaluation_id }: { evaluation_id: string }) {
        const [site, contest, user, task, submission, evaluation] = evaluation_id.split("/");

        const path = join(
          DATA_DIRECTORY,
          site,
          "contests",
          contest,
          "participations",
          user,
          "tasks",
          task,
          "submissions",
          submission,
          "evaluations",
          evaluation,
          "events.jsonl"
        )

        const tail = new Tail(path, {
          encoding: 'utf8',
          fromBeginning: true,
          follow: true,
        }) as Tail & EventEmitter;
        // Tail extends EventEmitter but it is not typed as such in @types/tail :(

        const lines = fromEvent<string>(tail, 'line');
        tail.watch();

        try {
          while(true) {
            const line = await lines.pipe(first()).toPromise();
            const event = JSON.parse(line);
            if(event.type === "end") {
              break;
            }
            yield {
              evaluation_events: {
                json: JSON.stringify(event)
              },
            }
          }
        } finally {
          tail.unwatch();
        }
      },
    },
  }
}
