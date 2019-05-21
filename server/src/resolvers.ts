import { PubSub } from "apollo-server";
import { execFile, execFileSync } from "child_process";
import { EventEmitter } from "events";
import { mkdirSync, readdirSync, writeFileSync } from "fs";
import { DateTime } from "luxon";
import { join } from "path";
import { Tail } from "tail";
import * as jwt from "jsonwebtoken"

import { config } from './index';
import { Node, NodeManager } from "./nodes";


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

async function* evaluationEvents(evaluation_id: string) {
  const path = join(config.DATA_DIRECTORY, evaluationManager.path(evaluation_id), "events.jsonl")

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
        json: JSON.stringify(event)
      };
    }
  } finally {
    tail.unwatch();
  }

}

interface PageQueryInput {
  // TODO: may be generated using graphqlgen
  before?: string
  after?: string
  first?: number
  last?: number
}

export const resolvers = {
  Query: {
    async site(obj: unknown, { id }: { id: string }) {
      return await siteManager.load(id);
    },
    async user(obj: unknown, { id }: { id: string }) {
      return await userManager.load(id, { loadDataIn: config.SITES_DIRECTORY });
    },
    async contest(obj: unknown, { id }: { id: string }) {
      return await contestManager.load(id, { loadDataIn: config.SITES_DIRECTORY });
    },
    async task(obj: unknown, { id }: { id: string }) {
      return await taskManager.load(id);
    },
    async participation(obj: unknown, { user_id, contest_id }: { user_id: string, contest_id: string }) {
      const { id_parts: { site: site1, user } } = await userManager.load(user_id, { loadDataIn: config.SITES_DIRECTORY });
      const { id_parts: { site: site2, contest } } = await contestManager.load(contest_id, { loadDataIn: config.SITES_DIRECTORY });
      const site = checkSameSite(site1, site2);
      return await participationManager.load(participationManager.formatId({ site, user, contest }));
    },
    async task_participation(obj: unknown, { user_id, task_id }: { user_id: string, task_id: string }) {
      const { id_parts: { site: site1, user } } = await userManager.load(user_id, { loadDataIn: config.SITES_DIRECTORY });
      const { id_parts: { site: site2, contest, task } } = await taskManager.load(task_id);
      const site = checkSameSite(site1, site2);
      return await taskParticipationManager.load({ site, user, contest, task });
    },
    async submission(obj: unknown, { id }: { id: string }) {
      return await submissionManager.load(id, { loadDataIn: config.DATA_DIRECTORY });
    },
    async evaluation(obj: unknown, { id }: { id: string }) {
      return await evaluationManager.load(id);
    },
  },
  User: {
    async site({ id_parts: { site } }: Node) {
      return await siteManager.load({ site });
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
      const dir = readdirSync(join(config.SITES_DIRECTORY, path, 'tasks'));
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
      const metadata = execFileSync("task-maker", [
        '--ui', 'tmsocial',
        '--task-info',
        '--task-dir', join(config.SITES_DIRECTORY, path)
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
      const dir = readdirSync(join(config.SITES_DIRECTORY, path, 'tasks'));
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
    async submissions(
      { id_parts: { site, contest, user, task }, path }: Node,
      { query: { before = "9999", after = "0000", last = 1e9, first = 1e9 } = {} }: { query?: PageQueryInput } = {}
    ) {
      mkdirSync(join(config.DATA_DIRECTORY, path, 'submissions'), { recursive: true });
      const dir = readdirSync(join(config.DATA_DIRECTORY, path, 'submissions')).sort();
      return await Promise.all(
        dir
          .filter(submission => submission > after && submission < before)
          .filter((_, i) => i < first)
          .reverse()
          .filter((_, i) => i < last)
          .reverse()
          .map(async submission => ({
            ...await submissionManager.load({ site, contest, user, task, submission }, { loadDataIn: config.DATA_DIRECTORY }),
            cursor: submission,
          }))
      );
    },
  },
  Submission: {
    async task_participation({ id_parts: { site, contest, user, task } }: Node) {
      return await taskParticipationManager.load({ site, contest, user, task });
    },
    async official_evaluation({ path, id_parts }: Node) {
      const dir = readdirSync(join(config.DATA_DIRECTORY, path, 'evaluations')).sort();
      const evaluation = dir[dir.length - 1];
      return await evaluationManager.load({ ...id_parts, evaluation });
    }
  },
  Evaluation: {
    async events({ id }: Node) {
      // TODO: make sure evaluation is already complete
      const events = [];
      for await (const event of evaluationEvents(id)) {
        console.log(event);
        events.push(event);
      }
      return events;
    },
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
      const { id_parts: { site: site2, user } } = await userManager.load(user_id, { loadDataIn: config.SITES_DIRECTORY });

      const site = checkSameSite(site1, site2);

      const submission = DateTime.utc().toISO();

      const submissionId = submissionManager.formatId({ site, contest, user, task, submission });
      const submissionPath = submissionManager.path(submissionId);

      mkdirSync(join(config.DATA_DIRECTORY, submissionPath), { recursive: true });
      writeFileSync(
        join(config.DATA_DIRECTORY, submissionPath, "data.json"),
        JSON.stringify({
          timestamp: submission,
        }), {
          encoding: 'utf8',
        }
      )

      mkdirSync(join(config.DATA_DIRECTORY, submissionPath, "files"), { recursive: true });

      const submittedFiles: string[] = [];
      files.forEach(({ field, type, content_base64 }) => {
        const file = join(config.DATA_DIRECTORY, submissionPath, 'files', `${field}.${type}`);
        submittedFiles.push(file);
        writeFileSync(file, Buffer.from(content_base64, 'base64'));
      })

      const evaluation = DateTime.utc().toISO();
      mkdirSync(join(config.DATA_DIRECTORY, submissionPath, 'evaluations', evaluation), { recursive: true });
      writeFileSync(join(config.DATA_DIRECTORY, submissionPath, 'evaluations', evaluation, 'events.jsonl'), Buffer.from([]));

      const args = [
        'evaluate',
        '--task-dir', join(config.SITES_DIRECTORY, site, 'contests', contest, 'tasks', task),
        '--evaluation-dir', join(config.DATA_DIRECTORY, submissionPath, 'evaluations', evaluation),
      ];
      submittedFiles.forEach(file => {
        args.push('--file', file);
      });

      console.log(`Executing: ${args}`);

      const process = execFile("../task_maker_wrapper/cli.py", args);
      process.unref();

      return await submissionManager.load(submissionId, { loadDataIn: config.DATA_DIRECTORY });
    }
  },
  Subscription: {
    evaluation_events: {
      async * subscribe(obj: any, { evaluation_id }: { evaluation_id: string }) {
        for await (const event of evaluationEvents(evaluation_id)) {
          yield {
            evaluation_events: event
          }
        };
      },
    },
  }
}
