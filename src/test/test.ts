import { uiComponent, State, uiRoot } from "../ui.js";
import { testBasicRender, testChildrenArgs, testSiblingRender } from "./render.js";
import { li, ul } from "../dom.js";
import { testAggregateWorkerEmpty, testAggregateWorkerSimple, testAggregateWorkerStack } from "./aggregateTree.js";

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

const resultsItem = uiComponent(function resultsItem(result: TestResult): HTMLElement {
    const innerText = `${result.name}: ${result.result === null ? 'PASS': 'FAIL'}`;
    return li({innerText});
});

const resultsList = uiComponent(function resultsList(results: State<TestResult[]>): HTMLElement {
    return ul({}, ...results.get().map(r => resultsItem(r)));
});

async function runTests(container: HTMLElement) {
    let results: TestResult[] = [];
    const state = new State(results);

    async function run(test: () => Promise<void>) {
        results = [...results, await runTest(test)];
        state.set(results);
    }

    uiRoot(container, resultsList, state);
    
    await run(testBasicRender);
    await run(testSiblingRender);
    await run(testChildrenArgs);

    await run(testAggregateWorkerEmpty);
    await run(testAggregateWorkerSimple);
    await run(testAggregateWorkerStack);
}

runTests(document.getElementById('results') as HTMLElement);
