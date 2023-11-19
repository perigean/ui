import { button, div } from "../dom.js";
import { uiRoot, uiComponent, State } from "../ui.js";


function run(container: HTMLElement) {
    uiRoot(container, uiComponent(() => {
        const counter = new State(0);
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
