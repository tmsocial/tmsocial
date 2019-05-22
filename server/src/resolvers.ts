import { PubSub } from "apollo-server";
import { execFile, execFileSync } from "child_process";
import { EventEmitter } from "events";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import * as jwt from "jsonwebtoken";
import { DateTime, Duration } from "luxon";
import { join } from "path";
import { Tail } from "tail";
import { config } from './index';
import { IdParts, PathManager } from "./nodes";

let metadataCache: {
    [id: string]: string
} = {};

let scoresCache: {
    [id: string]: any
} = {};

let latestSIGINT = DateTime.fromMillis(0);

process.on('SIGINT', async () => {
    if (DateTime.local().diff(latestSIGINT) < Duration.fromObject({ seconds: 5 })) {
        process.exit();
    }
    latestSIGINT = DateTime.local();

    console.log(`Invalidating caches. Press Ctrl-C within 5 seconds to terminate the server.`)

    metadataCache = {};
    scoresCache = {};
});

interface SubmissionFileInput {
    field: string
    type: string
    content_base64: string
}

interface PageQueryInput {
    // TODO: may be generated using graphqlgen
    before?: string
    after?: string
    first?: number
    last?: number
}

class NodeManager<T> {
    constructor(
        /** contains how ID/paths are structured */
        readonly path: PathManager,
        /** construct an instance of type T from ID information */
        readonly load: (node: { id: string, id_parts: IdParts, path: string, extra: any }) => T,
        /** loads any extra data to expose via GraphQL, loaded separately so it does not mess up with type inference */
        readonly loadExtra: (node: { id: string, id_parts: IdParts, path: string }) => any = () => ({}),
    ) { }

    private async doLoad({ id, id_parts }: { id: string, id_parts: IdParts }) {
        const path = this.path.buildPath(id_parts);
        const extra = await this.loadExtra({ id, id_parts, path });
        return {
            id, id_parts, path,
            ...extra as {}, // for GraphQL default resolvers
            ...await this.load({ id, id_parts, path, extra } || {}) as T,
        };
    }

    fromId(id: string) { return this.doLoad({ id, id_parts: this.path.parseId(id) }); }
    fromIdParts(id_parts: IdParts) { return this.doLoad({ id: this.path.buildId(id_parts), id_parts }); }
}

const loadDataOrConfig = async (root: string, path: string) => {
    const dataFilePath = join(root, path, 'data.json')
    if (existsSync(dataFilePath)) {
        return JSON.parse(readFileSync(dataFilePath, 'utf8')) as {};
    } else {
        throw new Error(`config/data not found in path ${path}`);
    }
}

const loadSiteConfig = async (path: string) => loadDataOrConfig(config.SITES_DIRECTORY, path);
const loadData = async (path: string) => loadDataOrConfig(config.DATA_DIRECTORY, path);

const checkSiteDirectoryExists = async (path: string) => {
    readdirSync(join(config.SITES_DIRECTORY, path));
};

const rootPath = new PathManager([]);

export const resolvers = {
    Query: {
        site: (root: unknown, { id }: { id: string }) => sites.fromId(id),
        user: (root: unknown, { id }: { id: string }) => users.fromId(id),
        contest: (root: unknown, { id }: { id: string }) => contests.fromId(id),
        task: (root: unknown, { id }: { id: string }) => tasks.fromId(id),
        submission: (root: unknown, { id }: { id: string }) => submissions.fromId(id),
        evaluation: (root: unknown, { id }: { id: string }) => evaluations.fromId(id),

        async participation(root: unknown, { user_id, contest_id }: { user_id: string, contest_id: string }) {
            const { id_parts: { site: site1, user } } = await users.fromId(user_id);
            const { id_parts: { site: site2, contest } } = await contests.fromId(contest_id);
            const site = checkSameSite(site1, site2);
            return await participations.fromIdParts({ site, user, contest });
        },
        async task_participation(root: unknown, { user_id, task_id }: { user_id: string, task_id: string }) {
            const { id_parts: { site: site1, user } } = await users.fromId(user_id);
            const { id_parts: { site: site2, contest, task } } = await tasks.fromId(task_id);
            const site = checkSameSite(site1, site2);
            return await taskParticipations.fromIdParts({ site, user, contest, task });
        },

    },
    Mutation: {
        async login(root: unknown, { site_id, user, password }: { site_id: string, user: string, password: string }) {
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
        },
    },
    Subscription: {
        evaluation_events: {
            async * subscribe(root: unknown, { evaluation_id }: { evaluation_id: string }) {
                const evaluation = await evaluations.fromId(evaluation_id);
                for await (const event of evaluation.event_stream()) {
                    yield {
                        evaluation_events: event
                    }
                };
            },
        },
    },
};

const sites = new NodeManager(rootPath.appendId("site"), () => ({}));

const users = new NodeManager(
    sites.path.appendPath("users").appendId("user"),
    ({ id_parts: { site, user } }) => ({
        site: () => sites.fromIdParts({ site }),
        async participation_in_contest({ contest_id }: { contest_id: string }) {
            const { id_parts: { site: site2, contest } } = await contests.fromId(contest_id);
            checkSameSite(site, site2);
            return await participations.fromIdParts({ site, contest, user });
        },
    }),
    ({ path }) => loadSiteConfig(path),
);

const contests = new NodeManager(
    sites.path.appendPath("contests").appendId("contest"),
    ({ path, id_parts: { site, contest }, extra: { metadata } }) => ({
        site: () => sites.fromIdParts({ site }),
        metadata_json: () => JSON.stringify(metadata || {}),
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
    ({ path }) => loadSiteConfig(path),
);

const tasks = new NodeManager(
    contests.path.appendPath("tasks").appendId("task"),
    ({ path, id, id_parts: { site, contest } }) => ({
        contest: () => contests.fromIdParts({ site, contest }),
        metadata_json: async () => {
            if (!(id in metadataCache)) {
                console.log(`Generating metadata...`)
                metadataCache[id] = await execFileSync("task-maker", [
                    '--ui', 'tmsocial',
                    '--task-info',
                    '--task-dir', join(config.SITES_DIRECTORY, path)
                ], { encoding: 'utf8' });
                console.log(`Metadata generated.`)
            }
            return metadataCache[id];
        },
    }),
    ({ path }) => checkSiteDirectoryExists(path),
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
            const submissions = await this.submissions();

            const task = await this.task();
            const metadata = JSON.parse(await task.metadata_json()) as {
                scorables: {
                    key: string,
                }[],
            };

            const allScores = await Promise.all(submissions.map(s => s.scores()));

            return metadata.scorables.map(({ key }, i) => ({
                key,
                score: allScores.map(scores => scores[i].score).reduce((a, b) => Math.max(a, b), 0),
            }));
        },
    }),
);

const submissions = new NodeManager(
    taskParticipations.path.appendPath("submissions").appendId("submission"),
    ({ path, id_parts: { site, contest, user, task, submission } }) => ({
        task_participation: () => taskParticipations.fromIdParts({ site, contest, user, task }),
        async official_evaluation() {
            const dir = readdirSync(join(config.DATA_DIRECTORY, path, 'evaluations')).sort();
            const evaluation = dir[dir.length - 1];
            return await evaluations.fromIdParts({ site, contest, user, task, submission, evaluation });
        },
        async scores() {
            const evaluation = await this.official_evaluation();
            return await evaluation.scores();
        }
    }),
    ({ path }) => loadData(path),
);

const evaluations = new NodeManager(
    submissions.path.appendPath("evaluations").appendId("evaluation"),
    ({ path, id, id_parts: { site, contest, user, task, submission, evaluation } }) => ({
        submission: () => submissions.fromIdParts({ site, contest, user, task, submission }),
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
            const listener = (line: string) => pubSub.publish("line", line);

            tail.on("line", listener);
            try {
                const iterator = pubSub.asyncIterator<string>("line");
                while (true) {
                    const { value: line } = await iterator.next();
                    const event = JSON.parse(line);
                    if (event.type === "end") {
                        iterator.return!();
                        break;
                    }
                    yield { json: JSON.stringify(event) };
                }
            } finally {
                tail.off("line", listener);
                tail.unwatch();
            }
        },
        async scores() {
            if (!(id in scoresCache)) {
                const submission = await this.submission();
                const task_participation = await submission.task_participation();
                const task = await task_participation.task();
                const metadata = JSON.parse(await task.metadata_json()) as {
                    scorables: {
                        key: string,
                    }[],
                };

                const values: any = {};
                const events = await this.events();
                for (const eventNode of events) {
                    const event = JSON.parse(eventNode.json);
                    if (event.type === "value") {
                        values[event.key] = event.value;
                    }
                }

                scoresCache[id] = metadata.scorables.map(({ key }) => ({
                    key,
                    score: values[key] ? values[key].score : 0,
                }));
            }
            return scoresCache[id];
        },
    }),
);

function checkSameSite(site1: string, site2: string) {
    if (site1 !== site2) {
        throw new Error(`Sites do not match: '${site1}', '${site2}'`)
    }
    return site1;
}
