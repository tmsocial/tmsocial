import { PubSub } from "apollo-server";
import { execFile, execFileSync } from "child_process";
import { EventEmitter } from "events";
import { mkdirSync, readdirSync, writeFileSync } from "fs";
import { DateTime } from "luxon";
import { join } from "path";
import { Tail } from "tail";
import { CONFIG_DIRECTORY, DATA_DIRECTORY, Node, NodeManager } from "./nodes";
import * as jwt from "jsonwebtoken"

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
const taskParticipationManager = participationManager.appendPath("tasks").appendId("task");
const submissionManager = taskParticipationManager.appendPath("submissions").appendId("submission");
const evaluationManager = submissionManager.appendPath("evaluations").appendId("evaluation");

function checkSameSite(site1: string, site2: string) {
  if (site1 !== site2) {
    throw new Error(`Sites do not match: '${site1}', '${site2}'`)
  }
  return site1;
}

export const resolvers = {
  Query: {
    async site(obj: unknown, { id }: { id: string }) {
      return await siteManager.load(id);
    },
    async user(obj: unknown, { id }: { id: string }) {
      return await userManager.load(id, { loadDataIn: CONFIG_DIRECTORY });
    },
    async contest(obj: unknown, { id }: { id: string }) {
      return await contestManager.load(id, { loadDataIn: CONFIG_DIRECTORY });
    },
    async task(obj: unknown, { id }: { id: string }) {
      return await taskManager.load(id);
    },
    async participation(obj: unknown, { user_id, contest_id }: { user_id: string, contest_id: string }) {
      const { id_parts: { site: site1, user } } = await userManager.load(user_id, { loadDataIn: CONFIG_DIRECTORY });
      const { id_parts: { site: site2, contest } } = await contestManager.load(contest_id, { loadDataIn: CONFIG_DIRECTORY });
      const site = checkSameSite(site1, site2);
      return await participationManager.load(participationManager.formatId({ site, user, contest }), { loadDataIn: CONFIG_DIRECTORY });
    },
    async task_participation(obj: unknown, { user_id, task_id }: { user_id: string, task_id: string }) {
      const { id_parts: { site: site1, user } } = await userManager.load(user_id, { loadDataIn: CONFIG_DIRECTORY });
      const { id_parts: { site: site2, contest, task } } = await taskManager.load(task_id);
      const site = checkSameSite(site1, site2);
      return await taskParticipationManager.load({ site, user, contest, task }, { loadDataIn: CONFIG_DIRECTORY });
    },
    async submission(obj: unknown, { id }: { id: string }) {
      return await submissionManager.load(id);
    },
    async evaluation(obj: unknown, { id }: { id: string }) {
      return await evaluationManager.load(id);
    },
  },
  Site: {
    async default_contest({ id_parts: { site } }: Node) {
      return await contestManager.load({ site, contest: 'default' }, { loadDataIn: CONFIG_DIRECTORY });
    },
  },
  User: {
    async site({ id_parts: { site } }: Node) {
      return await siteManager.load({ site });
    },
    async participation_in_default_contest({ id_parts: { site, user } }: Node) {
      return await participationManager.load({ site, contest: 'default', user });
    },
    async participation_in_contest({ id_parts: { site, user } }: Node, { contest_id }: { contest_id: string }) {
      const { id_parts: { site: site2, contest } } = await contestManager.load(contest_id);
      checkSameSite(site, site2);
      return await participationManager.load({ site, contest, user });
    },
  },
  Contest: {
    async site({ id_parts: { site } }: Node) {
      return await siteManager.load(siteManager.formatId({ site }));
    },
    async tasks({ path, id_parts: { site, contest } }: Node) {
      const dir = readdirSync(join(CONFIG_DIRECTORY, path, 'tasks'));
      return await Promise.all(dir.map(task => taskManager.load({ site, contest, task })));
    },
    async participation_of_user({ id_parts: { site, contest } }: Node, { user_id }: { user_id: string }) {
      const { id_parts: { site: site2, user } } = await userManager.load(user_id);
      checkSameSite(site, site2);
      return await participationManager.load({ site, contest, user });
    },
  },
  Task: {
    async contest({ id_parts: { site, contest } }: Node) {
      return await taskManager.load({ site, contest });
    },
    async metadata_json({ path }: Node) {
      const metadata = execFileSync("../task_maker_wrapper/metadata.py", [
        join(CONFIG_DIRECTORY, path)
      ], {
          encoding: 'utf8',
        });
      return metadata;
    },
  },
  Participation: {
    async user({ id_parts: { site, user } }: Node) {
      return await userManager.load({ site, user });
    },
    async contest({ id_parts: { site, contest } }: Node) {
      return await contestManager.load({ site, contest });
    },
    async task_participations({ id_parts: { site, contest, user } }: Node) {
      const { path } = await contestManager.load({ site, contest });
      const dir = readdirSync(join(CONFIG_DIRECTORY, path, 'tasks'));
      return await Promise.all(dir.map(task => taskParticipationManager.load({ site, contest, user, task })));
    },
  },
  TaskParticipation: {
    async user({ id_parts: { site, user } }: Node) {
      return await userManager.load({ site, user });
    },
    async task({ id_parts: { site, contest, task } }: Node) {
      return await taskManager.load({ site, contest, task });
    },
  },
  Submission: {
    async task_participation({ id_parts: { site, contest, user, task } }: Node) {
      return await taskParticipationManager.load({ site, contest, user, task });
    },
    async official_evaluation({ path, id_parts }: Node) {
      const dir = readdirSync(join(DATA_DIRECTORY, path, 'evaluations')).sort();
      const evaluation = dir[dir.length - 1];
      return await evaluationManager.load({ ...id_parts, evaluation });
    }
  },
  Mutation: {
    async login(obj: unknown, { site_id, user, password }: { site_id: string, user: string, password: string }) {
      console.log(await siteManager.load(site_id));
      const { id_parts: { site } } = await siteManager.load(site_id);
      const userNode = await userManager.load({ site, user });
      const { id: user_id } = userNode;

      console.log(`Logging on ${site} with username ${user} and password: ${password}`);

      const token = jwt.sign({ user_id }, "SecretKey!");
      return { user: userNode, token };
    },

    async submit(root: unknown, { task_id, user_id, files }: { task_id: string, user_id: string, files: SubmissionFileInput[] }) {
      const { id_parts: { site: site1, contest, task } } = await taskManager.load(task_id);
      const { id_parts: { site: site2, user } } = await userManager.load(user_id, { loadDataIn: CONFIG_DIRECTORY });

      const site = checkSameSite(site1, site2);

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

      return await submissionManager.load(submissionId, { loadDataIn: DATA_DIRECTORY });
    }
  },
  Subscription: {
    evaluation_events: {
      async * subscribe(obj: any, { evaluation_id }: { evaluation_id: string }) {
        const path = join(DATA_DIRECTORY, evaluationManager.path(evaluation_id), "events.jsonl")

        const tail = new Tail(path, {
          encoding: 'utf-8',
          fromBeginning: true,
        }) as Tail & EventEmitter;
        // Tail extends EventEmitter but it is not typed as such in @types/tail :(

        const pubSub = new PubSub();

        tail.on("line", (line) => pubSub.publish("line", line));

        try {
          const iterator = pubSub.asyncIterator<string>("line");
          while (true) {
            const { value: line } = await iterator.next();
            const event = JSON.parse(line);
            if (event.type === "end") {
              iterator.return!();
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
