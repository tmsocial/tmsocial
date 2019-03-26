import 'babel-polyfill';

import { testEvaluation, testMetadata } from "./test_data";
import { injectEvaluationView } from '.';


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function* events() {
    for (const e of testEvaluation) {
        await sleep(500);
        yield e;
    }
}

injectEvaluationView(document.getElementById("container"), testMetadata, events());
