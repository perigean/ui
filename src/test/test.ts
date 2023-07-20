import { uiComponent, uiRoot, uiSetState, uiState } from "../ui.js";
import { testBasicRender, testChildrenArgs, testSiblingRender } from "./render.js";

type TestResult = {
    name: string;
    result: null | unknown; // null is pass
};

async function runTest(test: () => Promise<void>): Promise<TestResult> {
    const name = test.name;
    console.log(`Running test "${name}"`);
    try {
        await test();
    } catch (result) {
        console.log(`FAILED test "${name}":\n${result}`);
        return { name, result };
    }
    console.log(`PASSED test "${name}"`);
    return {name, result: null };
}

const resultsItem = uiComponent(0, (result: TestResult): HTMLElement => {
    const e = document.createElement('li');
    e.innerText = `${result.name}: ${result.result === null ? 'PASS': 'FAIL'}`;
    return e;
});

const resultsList = uiComponent(1, (results: TestResult[]): HTMLElement => {
    const e = document.createElement('ul');
    for (const result of results) {
        e.appendChild(resultsItem(result));
    }
    return e;
});

async function runTests(container: HTMLElement) {
    const results: TestResult[] = [];
    const state = uiState(results);

    async function run(test: () => Promise<void>) {
        results.push(await runTest(test));
        uiSetState(state, results);
    }

    container.appendChild(uiRoot(resultsList, state));
    
    await run(testBasicRender);
    await run(testSiblingRender);
    await run(testChildrenArgs);
}

runTests(document.getElementById('results') as HTMLElement);
