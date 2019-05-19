import { readFileSync, readdirSync } from "fs";
import { join } from "path";

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
const DATA_DIRECTORY = '';

async function loadTaskDir(path: string, id: string): Promise<any> {
  return {path: join(path, 'tasks', id), id};
}

async function loadConfig(path: string): Promise<any> {
  let file;
  try {
    file = readFileSync(join(CONFIG_DIRECTORY, path, 'data.json'), 'utf8');
  } catch(e) {
    console.log(e);
    return null;
  }

  const content = JSON.parse(file);
  return {
    path, 
    ...content,
  }
}

export const resolvers = {
  Query: {
    site(obj: any, { id }: {id: string}) {
      return {
        path: `/${id}/`,
      };
    },
   },
  Site: {
    async default_contest({path}: {path: string}) {
      return await loadConfig(join(path, 'contests/default/'));
    },
    async user({path}: {path: string}, {id: user_id}: {id: string}) {
      return await loadConfig(join(path, 'users/', user_id));
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
  },
  Subscription: {
    evaluation_events: {
      subscribe(obj: any, { id }: { id: string }) {
        return makeDummyStream();
      },
    }
  }
}
