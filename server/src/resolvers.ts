import { PubSub } from "apollo-server";
import { execFile, execFileSync } from "child_process";
import { EventEmitter } from "events";
import { mkdirSync, readdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { DateTime } from "luxon";
import { join } from "path";
import { Tail } from "tail";
import * as jwt from "jsonwebtoken"

import { config } from './index';
import { IdParts, PathManager } from "./nodes";
import { eventNames } from "cluster";

interface SubmissionFileInput {
  field: string
  type: string
  content_base64: string
}

interface Node {
  id: string,
  id_parts: IdParts
  path: string,
}

class NodeManager<T> {
  constructor(
    readonly path: PathManager,
    readonly load: (node: Node & { path: string }) => void | T | Promise<void | T>,
  ) { }

  private async doLoad({ id, id_parts }: { id: string, id_parts: IdParts }) {
    const path = this.path.buildPath(id_parts);
    return {
      id,
      id_parts,
      path,
      ...await this.load({
        id,
        id_parts,
        path,
      } || {} as T)
    };
  }

  async fromId(id: string) {
    const id_parts = this.path.parseId(id);
    return await this.doLoad({ id, id_parts });
  }

  async fromIdParts(id_parts: IdParts) {
    const id = this.path.buildId(id_parts);
    return await this.doLoad({ id, id_parts });
  }
}

const loadDataOrConfig = async (root: string, path: string) => {
  const dataFilePath = join(root, path, 'data.json')
  if (existsSync(dataFilePath)) {
    return JSON.parse(readFileSync(dataFilePath, 'utf8'));
  } else {
    throw new Error(`config/data not found in path ${path}`);
  }
}

const loadSiteConfig = async (path: string) => loadDataOrConfig(config.SITES_DIRECTORY, path);
const loadData = async (path: string) => loadDataOrConfig(config.DATA_DIRECTORY, path);

const checkSiteDirectoryExists = async (path: string) => {
  // TODO
};

const rootPath = new PathManager([]);

const sites = new NodeManager(rootPath.appendId("site"), ({ path }) => ({}));

const users = new NodeManager(
  sites.path.appendPath("users").appendId("user"),
  ({ path, id_parts: { site, user } }) => ({
    ...loadSiteConfig(path),
    site: () => sites.fromIdParts({ site }),
    async participation_in_contest({ contest_id }: { contest_id: string }) {
      const { id_parts: { site: site2, contest } } = await contests.fromId(contest_id);
      checkSameSite(site, site2);
      return await participations.fromIdParts({ site, contest, user });
    },
  })
);

const contests = new NodeManager(
  sites.path.appendPath("contests").appendId("contest"),
  ({ path, id_parts: { site, contest } }) => ({
    ...loadSiteConfig(path),
    site: () => sites.fromIdParts({ site }),
    async tasks() {
      const dir = readdirSync(join(config.SITES_DIRECTORY, path, 'tasks'));
      return await Promise.all(dir.map(task => tasks.fromIdParts({ site, contest, task })));
    },
    async participation_of_user({ user_id }: { user_id: string }) {
      const { id_parts: { site: site2, user } } = await users.fromId(user_id);
      checkSameSite(site, site2);
      return await participations.fromIdParts({ site, contest, user });
    },
  }),
);

const tasks = new NodeManager(
  contests.path.appendPath("tasks").appendId("task"),
  ({ path, id_parts: { site, contest } }) => ({
    ...checkSiteDirectoryExists(path),
    contest: () => contests.fromIdParts({ site, contest }),
    metadata_json: async () => execFileSync("task-maker", [
      '--ui', 'tmsocial',
      '--task-info',
      '--task-dir', join(config.SITES_DIRECTORY, path)
    ], { encoding: 'utf8' }),
  })
);

const participations = new NodeManager(
  contests.path.appendPath("participations").appendId("user"),
  ({ id_parts: { site, user, contest } }) => ({
    user: () => users.fromIdParts({ site, user }),
    contest: () => contests.fromIdParts({ site, contest }),
    async task_participations() {
      const { path } = await contests.fromIdParts({ site, contest });
      const dir = readdirSync(join(config.SITES_DIRECTORY, path, 'tasks'));
      return await Promise.all(dir.map(task => taskParticipations.fromIdParts({ site, contest, user, task })));
    },
  })
);

const taskParticipations = new NodeManager(
  participations.path.appendPath("tasks").appendId("task"),
  ({ path, id_parts: { site, contest, user, task } }) => ({
    user: () => users.fromIdParts({ site, user }),
    task: () => tasks.fromIdParts({ site, contest, task }),
    async submissions(
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
            ...await submissions.fromIdParts({ site, contest, user, task, submission }),
            cursor: submission,
          }))
      );
    },
    async scores() {
      // TODO
    },
  }),
);

const submissions = new NodeManager(
  taskParticipations.path.appendPath("submissions").appendId("submission"),
  ({ path, id_parts: { site, contest, user, task, submission } }) => ({
    ...loadData(path),
    task_participation: () => taskParticipations.fromIdParts({ site, contest, user, task }),
    async official_evaluation() {
      const dir = readdirSync(join(config.DATA_DIRECTORY, path, 'evaluations')).sort();
      const evaluation = dir[dir.length - 1];
      return await evaluations.fromIdParts({ site, contest, user, task, submission, evaluation });
    }
  }),
);

const evaluations = new NodeManager(
  submissions.path.appendPath("evaluations").appendId("evaluation"),
  ({ path }) => ({
    ...loadData(path),
    async events() {
      const events = [];
      for await (const e of this.event_stream()) {
        events.push(e);
      }
      return events;
    },
    async * event_stream() {
      const tail = new Tail(join(config.DATA_DIRECTORY, path, "events.jsonl"), {
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
    },
    async scores({ id, id_parts: { site, contest, task } }: Node) {
      // TODO
    },
  })
);

function checkSameSite(site1: string, site2: string) {
  if (site1 !== site2) {
    throw new Error(`Sites do not match: '${site1}', '${site2}'`)
  }
  return site1;
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
    site: (obj: unknown, { id }: { id: string }) => sites.fromId(id),
    user: (obj: unknown, { id }: { id: string }) => users.fromId(id),
    contest: (obj: unknown, { id }: { id: string }) => contests.fromId(id),
    task: (obj: unknown, { id }: { id: string }) => tasks.fromId(id),
    submission: (obj: unknown, { id }: { id: string }) => submissions.fromId(id),
    evaluation: (obj: unknown, { id }: { id: string }) => evaluations.fromId(id),

    async participation(obj: unknown, { user_id, contest_id }: { user_id: string, contest_id: string }) {
      const { id_parts: { site: site1, user } } = await users.fromId(user_id);
      const { id_parts: { site: site2, contest } } = await contests.fromId(contest_id);
      const site = checkSameSite(site1, site2);
      return await participations.fromIdParts({ site, user, contest });
    },
    async task_participation(obj: unknown, { user_id, task_id }: { user_id: string, task_id: string }) {
      const { id_parts: { site: site1, user } } = await users.fromId(user_id);
      const { id_parts: { site: site2, contest, task } } = await tasks.fromId(task_id);
      const site = checkSameSite(site1, site2);
      return await taskParticipations.fromIdParts({ site, user, contest, task });
    },
  },
  Mutation: {
    async login(obj: unknown, { site_id, user, password }: { site_id: string, user: string, password: string }) {
      console.log(await sites.fromId(site_id));
      const { id_parts: { site } } = await sites.fromId(site_id);
      const userNode = await users.fromIdParts({ site, user });
      const { id: user_id } = userNode;

      console.log(`Logging on ${site} with username ${user} and password: ${password}`);

      const token = jwt.sign({ user_id }, "SecretKey!");
      return { user: userNode, token };
    },

    async submit(root: unknown, { task_id, user_id, files }: { task_id: string, user_id: string, files: SubmissionFileInput[] }) {
      const { id_parts: { site: site1, contest, task } } = await tasks.fromId(task_id);
      const { id_parts: { site: site2, user } } = await users.fromId(user_id);

      const site = checkSameSite(site1, site2);

      const submission = DateTime.utc().toISO();
      const submissionPath = submissions.path.buildPath({ site, contest, user, task, submission });

      mkdirSync(join(config.DATA_DIRECTORY, submissionPath), { recursive: true });
      writeFileSync(
        join(config.DATA_DIRECTORY, submissionPath, "data.json"),
        JSON.stringify({
          timestamp: submission,
        }), { encoding: 'utf8' },
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

      const process = execFile("../task_maker_wrapper/cli.py", [
        'evaluate',
        '--task-dir', join(config.SITES_DIRECTORY, site, 'contests', contest, 'tasks', task),
        '--evaluation-dir', join(config.DATA_DIRECTORY, submissionPath, 'evaluations', evaluation),
        ...submittedFiles.flatMap(file => ["--file", file]),
      ]);
      process.unref();

      return await submissions.fromIdParts({ site, contest, user, task, submission });
    }
  },
  Subscription: {
    evaluation_events: {
      async * subscribe(obj: unknown, { evaluation_id }: { evaluation_id: string }) {
        const evaluation = await evaluations.fromId(evaluation_id);
        for await (const event of evaluation.event_stream()) {
          yield {
            evaluation_events: event
          }
        };
      },
    },
  }
}
