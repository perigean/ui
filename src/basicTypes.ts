import { SimpleColumn, StackColumn, registerAggregate, registerAggregator, registerColumn } from "./aggregateTree.js";
import { HTMLElementStyleAttributes, div } from "./dom.js";
import { State, uiComponent } from "./ui.js";


export type NumberColumn = SimpleColumn<number, 'number'>;
registerColumn('number', (v: number) => v.toString());

export type StringColumn = SimpleColumn<string, 'strubg'>;
registerColumn('string', (v: string) => v);

export type NumberAggregate = { type: 'number'; value: number };
const NumberAggregateCell = uiComponent((style: HTMLElementStyleAttributes, a: State<NumberAggregate | undefined>) => {
    return div({style, innerText: a.trigger(v => {
        if (v ===  undefined) {
            return 'Loading...';
        } else {
            return v.value.toString();
        }
    })})
});
registerAggregate('number', NumberAggregateCell, v => v.value.toString());

registerAggregator('sum', 'number', [['number', false]], (rowBegin: number, rowEnd: number, c: NumberColumn) => {
    let value = 0;
    for (let i = rowBegin; i != rowEnd; i++) {
        value += c.data[i];
    }
    return {
        type: 'number',
        value,
    };
});

registerAggregator('max', 'number', [['number', false]], (rowBegin: number, rowEnd: number, c: NumberColumn) => {
    let value = c.data[rowBegin];
    for (let i = rowBegin + 1; i != rowEnd; i++) {
        value = Math.max(value, c.data[i]);
    }
    return {
        type: 'number',
        value,
    };
});

registerAggregator('min', 'number', [['number', false]], (rowBegin: number, rowEnd: number, c: NumberColumn) => {
    let value = c.data[rowBegin];
    for (let i = rowBegin + 1; i != rowEnd; i++) {
        value = Math.min(value, c.data[i]);
    }
    return {
        type: 'number',
        value,
    };
});

registerAggregator('mean', 'number', [['number', false]], (rowBegin: number, rowEnd: number, c: NumberColumn) => {
    let sum = 0;
    for (let i = rowBegin; i != rowEnd; i++) {
        sum += c.data[i];
    }
    return {
        type: 'number',
        value: sum / (rowEnd - rowBegin),
    };
});

registerAggregator('count', 'number', [], (rowBegin: number, rowEnd: number) => ({ type: 'number', value: rowEnd - rowBegin}));