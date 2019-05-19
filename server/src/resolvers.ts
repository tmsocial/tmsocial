import { execFile } from "child_process";
import { EventEmitter } from "events";
import { mkdirSync, readdirSync, writeFileSync } from "fs";
import { DateTime } from "luxon";
import { join } from "path";
import { fromEvent } from "rxjs";
import { first } from "rxjs/operators";
import { Tail } from "tail";
import { NodeManager, CONFIG_DIRECTORY, Node, DATA_DIRECTORY } from "./nodes";

interface SubmissionFileInput {
  field: string
  type: string
  content_base64: string
}

const siteManager = new NodeManager([]).appendId("site");
const userManager = siteManager.appendPath("users").appendId("user");
const contestManager = siteManager.appendPath("contests").appendId("contest");
const taskManager = contestManager.appendPath("tasks").appendId("task");
const participationManager = contestManager.appendPath("participations").appendId("user");
const participationTaskManager = participationManager.appendPath("tasks").appendId("task");
const submissionManager = participationTaskManager.appendPath("submissions").appendId("submission");
const evaluationManager = submissionManager.appendPath("evaluations").appendId("evaluation");

export const resolvers = {
  Query: {
    async site(obj: unknown, { id }: { id: string }) {
      return await siteManager.loadEmptyConfig(id);
    },
    async user(obj: unknown, { id }: { id: string }) {
      return await userManager.loadConfig(id);
    },
    async contest(obj: unknown, { id }: { id: string }) {
      return await contestManager.loadConfig(id);
    },
    async task(obj: unknown, { id }: { id: string }) {
      return await taskManager.loadEmptyConfig(id);
    },
    async submission(obj: unknown, { id }: { id: string }) {
      return await submissionManager.loadEmptyConfig(id);
    },
    async evaluation(obj: unknown, { id }: { id: string }) {
      return await evaluationManager.loadEmptyConfig(id);
    },
  },
  Site: {
    async default_contest({ id }: Node) {
      return await contestManager.loadConfig(`${id}/default`);
    },
  },
  Contest: {
    async tasks({ id }: Node) {
      const dir = readdirSync(join(CONFIG_DIRECTORY, contestManager.path(id), 'tasks'));
      return await Promise.all(dir.map(task => taskManager.loadEmptyConfig(`${id}/${task}`)));
    },
  },
  Submission: {
    async official_evaluation({ id }: Node) {
      const dir = readdirSync(join(DATA_DIRECTORY, submissionManager.path(id), 'evaluations')).sort();
      const evaluation = dir[dir.length - 1];
      return await evaluationManager.loadEmptyConfig(`${id}/${evaluation}`);
    }
  },
  Mutation: {
    async submit(root: unknown, { task_id, user_id, files }: { task_id: string, user_id: string, files: SubmissionFileInput[] }) {
      const { site, contest, task } = taskManager.parseId(task_id);
      const { site: site2, user } = userManager.parseId(user_id);

      if (site !== site2) {
        throw new Error("cannot submit for a different site");
      }

      const submission = DateTime.utc().toISO();

      const submissionId = submissionManager.formatId({ site, contest, user, task, submission });
      const submissionPath = submissionManager.path(submissionId);

      mkdirSync(join(DATA_DIRECTORY, submissionPath), { recursive: true });
      writeFileSync(
        join(DATA_DIRECTORY, submissionPath, "data.json"),
        JSON.stringify({
          timestamp: submission,
        }), {
          encoding: 'utf8',
        }
      )

      mkdirSync(join(DATA_DIRECTORY, submissionPath, "files"), { recursive: true });

      files.forEach(({ field, type, content_base64 }) => {
        writeFileSync(join(DATA_DIRECTORY, submissionPath, 'files', `${field}.${type}`), Buffer.from(content_base64, 'base64'));
      })

      const evaluation = DateTime.utc().toISO();
      mkdirSync(join(DATA_DIRECTORY, submissionPath, 'evaluations', evaluation), { recursive: true });

      const process = execFile("../task_maker_wrapper/adapter.py", [
        join(CONFIG_DIRECTORY, site, 'contests', contest, 'tasks', task),
        join(DATA_DIRECTORY, submissionPath),
        join(DATA_DIRECTORY, submissionPath, 'evaluations', evaluation),
      ]);
      process.unref();

      return await submissionManager.loadData(submissionId);
    }
  },
  Subscription: {
    evaluation_events: {
      async * subscribe(obj: any, { evaluation_id }: { evaluation_id: string }) {
        const path = join(DATA_DIRECTORY, evaluationManager.path(evaluation_id), "events.jsonl")

        const tail = new Tail(path, {
          encoding: 'utf8',
          fromBeginning: true,
          follow: true,
        }) as Tail & EventEmitter;
        // Tail extends EventEmitter but it is not typed as such in @types/tail :(

        const lines = fromEvent<string>(tail, 'line');
        tail.watch();

        try {
          while (true) {
            const line = await lines.pipe(first()).toPromise();
            const event = JSON.parse(line);
            if (event.type === "end") {
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
