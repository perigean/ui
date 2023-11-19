import { HTMLElementAttributes, div } from "../dom.js";
import { ListView, ListViewData } from "../listview.js";
import { State, uiRoot, uiComponent } from "../ui.js";


function run(container: HTMLElement) {
    const data: ListViewData<string> = {
        get: function (i: number): string {
            return `row ${i}`;
        },
        count: 1000,
        rowHeight: 32,
        renderRange: 2,
    };

    const row = uiComponent((s: State<string>, attributes: HTMLElementAttributes): HTMLElement => {
        return div({innerText: s, ...attributes});
    });

    uiRoot(container, ListView, {style: {
        height: '100%',
    }}, data, row);
}

run(document.getElementById('body') as HTMLElement);
