import { div } from "../dom.js";
import { GridView, ListViewData } from "../listview.js";
import { uiRoot } from "../ui.js";

function sleep(ms: number): PromiseLike<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function run(container: HTMLElement) {
    const data: ListViewData<[string, boolean, number]> = {
        get: function (i: number): [string, boolean, number] {
            return [`row ${i}`, (i % 3) === 0, i * Math.PI];
        },
        freshData: async function*() {
            for (let i = 1; i < 10; i++) {
                await sleep(100);
                yield i * 1000;
            }
        },
    };

    uiRoot(container, GridView, {style: {
        height: '100%',
    }}, data, 32, 3.0, [
        {
            renderCell: (s, style) => div({style, innerText: s}),
            renderHeader: style => div({style, innerText: 'string'}),
            gridTemplateColumn: '256px',
        },
        {
            renderCell: (s, style) => div({style, innerText: s.map(b => b ? 'true' : 'false')}),
            renderHeader: style => div({style, innerText: 'boolean'}),
            gridTemplateColumn: '256px',
        },
        {
            renderCell: (s, style) => div({style, innerText: s.map(n => `${n}`)}),
            renderHeader: style => div({style, innerText: 'number'}),
            gridTemplateColumn: '256px',
        },
    ]);
}

run(document.getElementById('body') as HTMLElement);
