import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { DateTime } from "luxon";

interface SubmissionFileInput {
  field: string
  type: string
  content_base64: string
}

interface Node {
  id: string,
  path: string,
}

async function* makeDummyStream() {
  yield {
    evaluation_events: {
      json: "1",
    }
  };
  await new Promise((res) => setTimeout(res, 1000));
  yield {
    evaluation_events: {
      json: "2",
    }
  };
};

const CONFIG_DIRECTORY = '../test_site/config';
const DATA_DIRECTORY = '../test_site/data';

async function loadTaskDir(path: string, id: string): Promise<any> {
  return {path: join(path, 'tasks', id), id};
}

async function loadNode(root: string, id: string, path: string): Promise<Node | null> {
  let file;
  try {
    file = readFileSync(join(root, path, 'data.json'), 'utf8');
  } catch(e) {
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
    async site(obj: any, { id }: {id: string}) {
      const [site] = id.split("/");
      return await loadConfig(id, join(site));
    },
   },
  Site: {
    async default_contest({id, path}: Node) {
      return await loadConfig(`${id}/default`, join(path, 'contests/default'));
    },
    async user({id, path}: Node, {id: user_id}: {id: string}) {
      return await loadConfig(`${id}/${user_id}`, join(path, 'users/', user_id));
    },
  },
  Contest: {
    async tasks({path}: {path: string}) {
      const dir = readdirSync(join(CONFIG_DIRECTORY, path, 'tasks/'));
      return await Promise.all(dir.map(id => loadTaskDir(path, id)));
    },
    async task({path}: {path: string}, {id} : {id: string}) {
      return await loadTaskDir(path, id);
    },
  },
  ContestTask: {
    id({id}: {id: string}) {
      return id;
    }
  },
  Mutation: {
    async submit(root: any, { task_id, user_id, files }: {task_id: string, user_id: string, files: SubmissionFileInput[] }) {
      const [site, contest, task] = task_id.split("/");
      const [site2, user] = user_id.split("/");
      
      if(site !== site2) {
        throw new Error("cannot submit for a different site");
      }

      const submission = DateTime.utc().toISO();

      const submissionPath = join(
        "site", 
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

      mkdirSync(join(DATA_DIRECTORY, submissionPath), { recursive: true } );
      writeFileSync(join(DATA_DIRECTORY, submissionPath, "data.json"), JSON.stringify({
        timestamp: submission,
      }), {
        encoding: 'utf8',
      })

      return await loadData(`${site}/${contest}/${user}/${task}/${submission}`, submissionPath);
    }
  },
  Submission: {
  },
  Subscription: {
    evaluation_events: {
      subscribe(obj: any, { id }: { id: string }) {
        return makeDummyStream();
      },
    },
  }
}
