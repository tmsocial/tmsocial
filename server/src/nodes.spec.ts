import { PathManager } from "./nodes";

describe("PathManager", () => {
    it("should parse ids", () => {
        const manager = new PathManager([]).appendPath("a").appendId("a").appendPath("b").appendId("b");
        console.log(manager.parseId("X/Y"));
    })
})