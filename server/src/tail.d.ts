declare module "tail" {
    import { EventEmitter } from "events";

    export class Tail extends EventEmitter {
        constructor(path: string);
        watch(): void;
        unwatch(): void;
    }
}
