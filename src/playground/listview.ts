import { HTMLElementAttributes, div } from "../dom.js";
import { ListView, ListViewData } from "../listview.js";
import { State, uiRoot, uiComponent } from "../ui.js";

function sleep(ms: number): PromiseLike<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function run(container: HTMLElement) {
    const data: ListViewData<string> = {
        get: function (i: number): string {
            return `row ${i}`;
        },
        freshData: async function*() {
            for (let i = 1; i < 100; i++) {
                await sleep(100);
                yield i * 1000;
            }
        },
    };

    const row = uiComponent((s: State<string>, attributes: HTMLElementAttributes): HTMLElement => {
        return div({innerText: s, ...attributes});
    });

    uiRoot(container, ListView, {style: {
        height: '100%',
    }}, data, 32, 3.0, row);
}

run(document.getElementById('body') as HTMLElement);
