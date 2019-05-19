import { join } from "path";
import { readFileSync } from "fs";

export const CONFIG_DIRECTORY = '../test_site/config';
export const DATA_DIRECTORY = '../test_site/data';

export interface Node {
    id: string,
}

interface IdSegment { type: "id", name: string };
interface ConstantSegment { type: "path", path: string };
type PathSegment = IdSegment | ConstantSegment;

export class NodeManager {
    constructor(
        readonly segments: PathSegment[],
    ) { }

    appendPath(path: string) {
        return new NodeManager([...this.segments, { type: "path", path }])
    }

    appendId(name: string) {
        return new NodeManager([...this.segments, { type: "id", name }])
    }

    parseId(id: string) {
        const parts = id.split("/");
        const parsed: { [name: string]: string } = {};

        const expectedParts = this.segments.filter(s => s.type === "id").length;
        if(parts.length !== expectedParts) {
            throw new Error(`unable to parse id, expected ${expectedParts} parts, got ${parts.length}`);
        }

        this.segments.filter(s => s.type === "id").forEach((segment, i) => {
            parsed[(segment as IdSegment).name] = parts[i];
        });
        return parsed;
    }

    formatId(parts: { [name: string]: string }) {
        return this.segments.filter(s => s.type === "id").map((segment, i) => parts[(segment as IdSegment).name]).join("/");
    }

    path(id: string) {
        const idParts = this.parseId(id);
        const pathParts = [];
        for (const segment of this.segments) {
            if (segment.type === "id") {
                pathParts.push(idParts[segment.name]);
            }
            if (segment.type === "path") {
                pathParts.push(segment.path);
            }
        }
        return join(...pathParts);
    }

    async loadEmptyConfig(id: string): Promise<Node> {
        return { id };
    }

    async loadNode(root: string, id: string): Promise<Node | null> {
        let file;
        try {
            file = readFileSync(join(root, this.path(id), 'data.json'), 'utf8');
        } catch (e) {
            console.log(e);
            return null;
        }

        const content = JSON.parse(file);
        return {
            id,
            ...content,
        };
    }

    async loadConfig(id: string): Promise<any> {
        return await this.loadNode(CONFIG_DIRECTORY, id);
    }

    async loadData(id: string): Promise<any> {
        return await this.loadNode(DATA_DIRECTORY, id);
    }
}

