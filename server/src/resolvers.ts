import { PubSub } from 'apollo-server';
import { execFile, execFileSync } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import * as jwt from 'jsonwebtoken';
import { DateTime, Duration } from 'luxon';
import { join } from 'path';
import { Tail } from 'tail';
import { config } from './index';
import { IdParts, PathManager } from './nodes';
import { fromEvent } from 'rxjs';
import { bufferTime, takeUntil, map, takeWhile, tap } from 'rxjs/operators';

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

    console.log(`Invalidating caches. Press Ctrl-C within 5 seconds to terminate the server.`);

    metadataCache = {};
    scoresCache = {};
});

interface SubmissionFileInput {
    field: string;
    type: string;
    contentBase64: string;
}

interface PageQueryInput {
    // TODO: may be generated using graphqlgen
    before?: string;
    after?: string;
    first?: number;
    last?: number;
}

class NodeManager<T> {
    constructor(
        /** contains how ID/paths are structured */
        readonly path: PathManager,
        /** construct an instance of type T from ID information */
        readonly load: (node: { id: string, idParts: IdParts, path: string, extra: any }) => T,
        /** loads any extra data to expose via GraphQL, loaded separately so it does not mess up with type inference */
        readonly loadExtra: (node: { id: string, idParts: IdParts, path: string }) => any = () => ({}),
    ) { }

    private async doLoad({ id, idParts }: { id: string, idParts: IdParts }) {
        const path = this.path.buildPath(idParts);
        const extra = await this.loadExtra({ id, idParts, path });
        return {
            id, idParts, path,
            ...extra as {}, // for GraphQL default resolvers
            ...await this.load({ id, idParts, path, extra } || {}) as T,
        };
    }

    fromId(id: string) { return this.doLoad({ id, idParts: this.path.parseId(id) }); }
    fromIdParts(idParts: IdParts) { return this.doLoad({ id: this.path.buildId(idParts), idParts }); }
}

const loadDataOrConfig = async (root: string, path: string) => {
    const dataFilePath = join(root, path, 'data.json');
    if (existsSync(dataFilePath)) {
        return JSON.parse(readFileSync(dataFilePath, 'utf8')) as {};
    } else {
        throw new Error(`config/data not found in path ${path}`);
    }
};

const loadSiteConfig = async (path: string) => loadDataOrConfig(config.sitesDir, path);
const loadData = async (path: string) => loadDataOrConfig(config.dataDir, path);

const checkSiteDirectoryExists = async (path: string) => {
    readdirSync(join(config.sitesDir, path));
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

        async participation(root: unknown, { userId, contestId }: { userId: string, contestId: string }) {
            const { idParts: { site: site1, user } } = await users.fromId(userId);
            const { idParts: { site: site2, contest } } = await contests.fromId(contestId);
            const site = checkSameSite(site1, site2);
            return await participations.fromIdParts({ site, user, contest });
        },
        async taskParticipation(root: unknown, { userId, taskId }: { userId: string, taskId: string }) {
            const { idParts: { site: site1, user } } = await users.fromId(userId);
            const { idParts: { site: site2, contest, task } } = await tasks.fromId(taskId);
            const site = checkSameSite(site1, site2);
            return await taskParticipations.fromIdParts({ site, user, contest, task });
        },

    },
    Mutation: {
        async login(root: unknown, { siteId, user, password }: { siteId: string, user: string, password: string }) {
            console.log(await sites.fromId(siteId));
            const { idParts: { site } } = await sites.fromId(siteId);
            const userNode = await users.fromIdParts({ site, user });
            const { id: userId } = userNode;

            console.log(`Logging on ${site} with username ${user} and password: ${password}`);

            const token = jwt.sign({ userId }, 'SecretKey!');
            return { user: userNode, token };
        },

        async submit(root: unknown, { taskId, userId, files }: { taskId: string, userId: string, files: SubmissionFileInput[] }) {
            const { idParts: { site: site1, contest, task } } = await tasks.fromId(taskId);
            const { idParts: { site: site2, user } } = await users.fromId(userId);

            const site = checkSameSite(site1, site2);

            const submission = DateTime.utc().toISO();
            const submissionPath = submissions.path.buildPath({ site, contest, user, task, submission });

            mkdirSync(join(config.dataDir, submissionPath), { recursive: true });
            writeFileSync(
                join(config.dataDir, submissionPath, 'data.json'),
                JSON.stringify({
                    timestamp: submission,
                }), { encoding: 'utf8' },
            );

            mkdirSync(join(config.dataDir, submissionPath, 'files'), { recursive: true });

            const submittedFiles: string[] = [];
            files.forEach(({ field, type, contentBase64 }) => {
                const file = join(config.dataDir, submissionPath, 'files', `${field}.${type}`);
                submittedFiles.push(file);
                writeFileSync(file, Buffer.from(contentBase64, 'base64'));
            });

            const evaluation = DateTime.utc().toISO();
            mkdirSync(join(config.dataDir, submissionPath, 'evaluations', evaluation), { recursive: true });
            writeFileSync(join(config.dataDir, submissionPath, 'evaluations', evaluation, 'events.jsonl'), Buffer.from([]));

            const process = execFile('../task_maker_wrapper/cli.py', [
                'evaluate',
                '--task-dir', join(config.sitesDir, site, 'contests', contest, 'tasks', task),
                '--evaluation-dir', join(config.dataDir, submissionPath, 'evaluations', evaluation),
                ...submittedFiles.flatMap(file => ['--file', file]),
            ]);
            process.unref();

            return await submissions.fromIdParts({ site, contest, user, task, submission });
        },
    },
    Subscription: {
        evaluationEvents: {
            async * subscribe(root: unknown, { evaluationId }: { evaluationId: string }) {
                const evaluation = await evaluations.fromId(evaluationId);
                for await (const event of evaluation.event_stream()) {
                    yield {
                        evaluationEvents: event
                    };
                }
            },
        },
    },
};

const sites = new NodeManager(rootPath.appendId('site'), () => ({}));

const users = new NodeManager(
    sites.path.appendPath('users').appendId('user'),
    ({ idParts: { site, user } }) => ({
        site: () => sites.fromIdParts({ site }),
        async participationInContest({ contestId }: { contestId: string }) {
            const { idParts: { site: site2, contest } } = await contests.fromId(contestId);
            checkSameSite(site, site2);
            return await participations.fromIdParts({ site, contest, user });
        },
    }),
    ({ path }) => loadSiteConfig(path),
);

const contests = new NodeManager(
    sites.path.appendPath('contests').appendId('contest'),
    ({ path, idParts: { site, contest } }) => ({
        site: () => sites.fromIdParts({ site }),
        async tasks() {
            const dir = readdirSync(join(config.sitesDir, path, 'tasks'));
            return await Promise.all(dir.map(task => tasks.fromIdParts({ site, contest, task })));
        },
        async participationOfUser({ userId }: { userId: string }) {
            const { idParts: { site: site2, user } } = await users.fromId(userId);
            checkSameSite(site, site2);
            return await participations.fromIdParts({ site, contest, user });
        },
    }),
    ({ path }) => loadSiteConfig(path),
);

const tasks = new NodeManager(
    contests.path.appendPath('tasks').appendId('task'),
    ({ path, id, idParts: { site, contest } }) => ({
        contest: () => contests.fromIdParts({ site, contest }),
        metadataJson: async () => {
            if (!(id in metadataCache)) {
                console.log(`Generating metadata...`);
                metadataCache[id] = await execFileSync('task-maker', [
                    '--ui', 'tmsocial',
                    '--task-info',
                    '--task-dir', join(config.sitesDir, path)
                ], { encoding: 'utf8' });
                console.log(`Metadata generated.`);
            }
            return metadataCache[id];
        },
    }),
    ({ path }) => checkSiteDirectoryExists(path),
);

const participations = new NodeManager(
    contests.path.appendPath('participations').appendId('user'),
    ({ idParts: { site, user, contest } }) => ({
        user: () => users.fromIdParts({ site, user }),
        contest: () => contests.fromIdParts({ site, contest }),
        async taskParticipations() {
            const { path } = await contests.fromIdParts({ site, contest });
            const dir = readdirSync(join(config.sitesDir, path, 'tasks'));
            return await Promise.all(dir.map(task => taskParticipations.fromIdParts({ site, contest, user, task })));
        },
    })
);

const taskParticipations = new NodeManager(
    participations.path.appendPath('tasks').appendId('task'),
    ({ path, idParts: { site, contest, user, task } }) => ({
        user: () => users.fromIdParts({ site, user }),
        task: () => tasks.fromIdParts({ site, contest, task }),
        async submissions(
            { query: { before = '9999', after = '0000', last = 1e9, first = 1e9 } = {} }: { query?: PageQueryInput } = {}
        ) {
            mkdirSync(join(config.dataDir, path, 'submissions'), { recursive: true });
            const dir = readdirSync(join(config.dataDir, path, 'submissions')).sort();
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
            const metadata = JSON.parse(await task.metadataJson()) as {
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
    taskParticipations.path.appendPath('submissions').appendId('submission'),
    ({ path, idParts: { site, contest, user, task, submission } }) => ({
        taskParticipation: () => taskParticipations.fromIdParts({ site, contest, user, task }),
        async scoredEvaluation() {
            const dir = readdirSync(join(config.dataDir, path, 'evaluations')).sort();
            const evaluation = dir[dir.length - 1];
            return await evaluations.fromIdParts({ site, contest, user, task, submission, evaluation });
        },
        async scores() {
            const evaluation = await this.scoredEvaluation();
            return await evaluation.scores();
        }
    }),
    ({ path }) => loadData(path),
);

const evaluations = new NodeManager(
    submissions.path.appendPath('evaluations').appendId('evaluation'),
    ({ path, id, idParts: { site, contest, user, task, submission, evaluation } }) => ({
        submission: () => submissions.fromIdParts({ site, contest, user, task, submission }),
        async events() {
            const events = [];
            for await (const chunk of this.event_stream()) {
                for (const e of chunk) {
                    events.push(e);
                }
            }
            return events;
        },
        async * event_stream() {
            const tail = new Tail(join(config.dataDir, path, 'events.jsonl'), {
                encoding: 'utf-8',
                fromBeginning: true,
            }) as Tail & EventEmitter;
            // Tail extends EventEmitter but it is not typed as such in @types/tail :(

            const pubSub = new PubSub();

            const bufferTimeSpan = 100;
            const bufferMaxSize = 100;

            const subscription = fromEvent<string>(tail, 'line').pipe(
                takeWhile(json => JSON.parse(json).type !== 'end'),
                map(json => ({ json })),
                bufferTime(bufferTimeSpan, undefined, bufferMaxSize),
                tap((events) => console.log(events)),
            ).subscribe({
                next: (events) => pubSub.publish('events', events),
                complete: () => pubSub.publish('events', 'complete')
            });

            try {
                const iterator = pubSub.asyncIterator<'complete' | { json: string }[]>('events');
                while (true) {
                    const { value } = await iterator.next();
                    console.log(value);
                    if (value === 'complete') { break; }
                    yield value;
                }
            } finally {
                tail.unwatch();
                subscription.unsubscribe();
            }
        },
        async scores() {
            if (!(id in scoresCache)) {
                const submission = await this.submission();
                const taskParticipation = await submission.taskParticipation();
                const task = await taskParticipation.task();
                const metadata = JSON.parse(await task.metadataJson()) as {
                    scorables: {
                        key: string,
                    }[],
                };

                const values: any = {};
                const events = await this.events();
                for (const eventNode of events) {
                    const event = JSON.parse(eventNode.json);
                    if (event.type === 'value') {
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
        throw new Error(`Sites do not match: '${site1}', '${site2}'`);
    }
    return site1;
}
