import { join } from "path";

export interface IdParts {
    [name: string]: string
}

interface IdSegment { type: "id", name: string };
interface ConstantSegment { type: "path", path: string };
type PathSegment = IdSegment | ConstantSegment;

export class PathManager {
    constructor(
        readonly segments: PathSegment[],
    ) { }

    appendPath(path: string) {
        return new PathManager([...this.segments, { type: "path", path }])
    }

    appendId(name: string) {
        return new PathManager([...this.segments, { type: "id", name }])
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

    buildId(parts: IdParts) {
        return this.segments.filter(s => s.type === "id").map((segment, i) => parts[(segment as IdSegment).name]).join("/");
    }

    buildPath(id_parts: IdParts) {
        const pathParts = [];
        for (const segment of this.segments) {
            if (segment.type === "id") {
                pathParts.push(id_parts[segment.name]);
            }
            if (segment.type === "path") {
                pathParts.push(segment.path);
            }
        }
        return join(...pathParts);
    }
}

