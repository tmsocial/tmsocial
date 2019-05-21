import { join } from "path";
import { readFileSync, existsSync } from "fs";


export interface IdParts {
    [name: string]: string
}

export interface Node {
    id: string,
    id_parts: IdParts
    path: string
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

    async load(idOrIdParts: string | IdParts, { loadDataIn }: {
        loadDataIn?: string,
    } = {}): Promise<Node & object> {
        let id;
        if (typeof idOrIdParts === "string") {
            id = idOrIdParts;
        } else {
            id = this.formatId(idOrIdParts);
        }
        const id_parts = this.parseId(id);

        const path = this.path(id);
        let data;
        if (loadDataIn !== undefined) {
            const dataFilePath = join(loadDataIn, path, 'data.json')
            if (existsSync(dataFilePath)) {
                data = JSON.parse(readFileSync(dataFilePath, 'utf8'));
            } else {
                throw new Error(`id '${id}' not found`);
            }
        } else {
            data = {};
        }
        return {
            id,
            id_parts,
            path,
            ...data,
        };
    }

    parseId(id: string) {
        const parts = id.split("/");
        const parsed: IdParts = {};

        const expectedParts = this.segments.filter(s => s.type === "id").length;
        if (parts.length !== expectedParts) {
            throw new Error(`unable to parse id, expected ${expectedParts} parts, got ${parts.length}`);
        }

        this.segments.filter(s => s.type === "id").forEach((segment, i) => {
            parsed[(segment as IdSegment).name] = parts[i];
        });
        return parsed;
    }

    formatId(parts: IdParts) {
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
}

