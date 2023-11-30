import { HTMLElementAttributes, HTMLElementStyleAttributes, div } from "../dom.js";
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
            for (let i = 1; i < 10; i++) {
                await sleep(100);
                yield i * 1000;
            }
        },
    };

    const row = uiComponent((s: State<string>, style: HTMLElementStyleAttributes): HTMLElement => {
        return div({innerText: s, style});
    });

    const header = uiComponent((style: HTMLElementStyleAttributes): HTMLElement => {
        return div({innerText: 'header', style: {...style, background: 'white', borderBottom: '1px solid black' }});
    });

    uiRoot(container, ListView, {style: {
        height: '100%',
    }}, data, 32, 3.0, row, header);
}

run(document.getElementById('body') as HTMLElement);
