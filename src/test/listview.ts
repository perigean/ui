import { Attributes, div } from "../dom.js";
import { ListView, ListViewData } from "../listview.js";
import { RenderedElement, State, uiComponent, uiRoot } from "../ui.js";


function run(container: HTMLElement) {
    const data: ListViewData<string> = {
        get: function (i: number): string {
            return `row ${i}`;
        },
        count: 1000,
        rowHeight: 32,
        renderRange: 2,
    };

    const row = uiComponent(0, (s: State<string>, attributes: Attributes): HTMLElement => {
        return div({innerText: s, ...attributes});
    });

    container.appendChild(uiRoot(ListView, {style: {
        height: '100%',
    }}, data, row));
}

run(document.getElementById('body') as HTMLElement);
