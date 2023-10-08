import { uiComponent, uiRoot, uiSetState, State } from "../ui.js";
import { testBasicRender, testChildrenArgs, testSiblingRender } from "./render.js";

type TestResult = {
    name: string;
    result: null | unknown; // null is pass
};

async function runTest(test: () => Promise<void>): Promise<TestResult> {
    const name = test.name;
    console.log(`Running test "${name}"`);
    console.time(`TEST ${name}`);
    try {
        await test();
    } catch (result) {
        console.log(`FAILED test "${name}":\n${result}`);
        return { name, result };
    } finally {
        console.timeEnd(`TEST ${name}`);
    }
    console.log(`PASSED test "${name}"`);
    return {name, result: null };
}

const resultsItem = uiComponent(0, function resultsItem(result: TestResult): HTMLElement {
    const e = document.createElement('li');
    e.innerText = `${result.name}: ${result.result === null ? 'PASS': 'FAIL'}`;
    return e;
});

const resultsList = uiComponent(1, function resultsList(results: TestResult[]): HTMLElement {
    const e = document.createElement('ul');
    for (const result of results) {
        e.appendChild(resultsItem(result));
    }
    return e;
});

async function runTests(container: HTMLElement) {
    let results: TestResult[] = [];
    const state = new State(results);

    async function run(test: () => Promise<void>) {
        results = [...results, await runTest(test)];
        uiSetState(state, results);
    }

    container.appendChild(uiRoot(resultsList, state));
    
    await run(testBasicRender);
    await run(testSiblingRender);
    await run(testChildrenArgs);
}

runTests(document.getElementById('results') as HTMLElement);
