import 'babel-polyfill';
import { injectEvaluationView } from '.';
import { testEvaluation, testMetadata } from "./test_data";



const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* events() {
    for (const e of testEvaluation) {
        await sleep(500);
        yield e;
    }
}

injectEvaluationView(document.getElementById("container") as any, testMetadata, events());
