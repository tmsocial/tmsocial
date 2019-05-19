import { NodeManager } from "./nodes";

describe("NodeManager", () => {
    it("should parse ids", () => {
        const manager = new NodeManager([]).appendPath("a").appendId("a").appendPath("b").appendId("b");
        console.log(manager.parseId("X/Y"));
    })
})