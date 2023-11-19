import { button, div } from "../dom.js";
import { uiRoot, uiComponent, uiState } from "../ui.js";


function run(container: HTMLElement) {
    uiRoot(container, uiComponent(() => {
        const counter = uiState('counter', 0);
        return div(
            { style: {
                    display: 'grid',
                    gridTemplateRows: '32px 32px 32px',
                    gridTemplateColumns: '192px',
                },
            },
            div({innerText: counter.map(v => v.toString())}),
            button({textContent: 'increment', onclick: () => {
                counter.set(counter.get() + 1);
            }}),
            button({textContent: 'decrement', onclick: () => {
                counter.set(counter.get() - 1);
            }}),
        );
    }));
}

run(document.getElementById('body') as HTMLElement);
