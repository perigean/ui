import { AggregateWorker, Column, SimpleColumn, lookupAggregatePrinter, lookupColumnPrinter, registerAggregator, registerColumn } from "../aggregateTree.js";
import { assertEq } from "./util.js";
import "../basicTypes.js";


function createColumnWriter<T, ColumnT extends Column<T>>(column: ColumnT, parser: (t: string) => T): (t: string) => void {
    if (column.stack) {
        const memoFrames = new Map<string, number>();
        return (t: string): void => {
            let frameIndex = memoFrames.get(t);
            if (frameIndex === undefined) {
                const frames = t.split('/').map(f => f.trim()).filter(f => f.length !== 0).map(f => parser(f.trim()));
                frameIndex = column.frames.length;
                column.frames[frameIndex] = frames;
                memoFrames.set(t, frameIndex);
            }
            column.data[column.data.length] = frameIndex;
        };
    } else {
        return (t: string): void => {
            column.data[column.data.length] = parser(t);
        };
    }
};

function writeColumns(writers: ((t: string) => void)[], ...lines: string[]): void {
    let lineNum = 0;
    for (const line of lines) {
        lineNum++;
        try {
            const fields = line.split('|').map(f => f.trim());
            if (fields.length !== writers.length) {
                throw new Error(`line has ${fields.length} fields, expected ${writers.length}`);
            }
            for (let i = 0; i < writers.length; i++) {
                writers[i](fields[i]);
            }
        } catch (e) {
            throw new Error(`on line ${lineNum}`, {cause: e});
        }
    }
}

function createColumns(types: ('number' | 'numberStack' | 'string' | 'stringStack')[], ...lines: string[]): Column[] {
    const columns = types.map((t): Column => {
        switch (t) {
            case 'number':
                return {
                    type: 'number',
                    stack: false,
                    data: [],
                };
            case 'numberStack':
                return {
                    type: 'number',
                    stack: true,
                    frames: [],
                    data: [],
                };
            case 'string':
                return {
                    type: 'string',
                    stack: false,
                    data: [],
                };
            case 'stringStack':
                return {
                    type: 'string',
                    stack: true,
                    frames: [],
                    data: [],
                };
        }
    });
    
    const writers = columns.map(c => {
        switch(c.type) {
            case 'string':
                return createColumnWriter(c, x => x);
            case 'number':
                return createColumnWriter(c, Number.parseFloat);
            default:
                throw new Error(`unexpected column type "${c.type}"`);
        }
    });
    writeColumns(writers, ...lines);
    return columns;
}

export async function testAggregateWorkerEmpty() {
    const w = new AggregateWorker({
        columns: createColumns(
            ['number'],
            '0',
            '1',
            '2',
            '3',
        ),
        expanders: [],
        aggregators: [
            { name: 'sum', args: [0] },
            { name: 'count', args: [] },
        ],
    });
    assertTree(
        w,
        '| 6 | 4',
    );
}

function aggregateToString<AggregateT extends { type: string }>(a: AggregateT): string {
    return lookupAggregatePrinter(a.type)(a);
}

function expanderFromId(w: AggregateWorker, id: number): string {
    if (id === 0) {
        return '';
    }
    const value = w.getValue(id);
    let result = '';
    for (let i = 0; i < value.expander; i++) {
        result += ' ';
    }
    for (let i = 0; i < value.frame; i++) {
        result += '.';
    }
    result += lookupColumnPrinter(value.type)(value.value);
    return result;
}

function assertTree(w: AggregateWorker, ...lines: string[]) {
    // Initialize the stack with root, since that's expected.
    const stack: Map<string, number>[] = [new Map([['',0]])];
    let lineNum = 0;
    for (const line of lines) {
        lineNum++;
        const fields = line.split('|');
        const aggregates = fields.slice(1).map(a => a.trim());
        const expander = fields[0].trimEnd();
        
        if (stack.length === 0) {
            throw new Error(`line ${lineNum}: no more lines expected`);
        }
        const id = stack[stack.length - 1].get(expander);
        if (id === undefined) {
            throw new Error(`line ${lineNum}: "${expander}" not expected, expecting one of {${
                [...stack[stack.length - 1].keys()].map(k => `"${k}"`).join(', ')
            }}`);
        }
        stack[stack.length - 1].delete(expander);
                
        // Validate aggregates.
        for (let i = 0; i < aggregates.length; i++) {
            const aggregate = aggregateToString(w.getAggregate(id, i));
            if (aggregates[i] !== aggregate) {
                throw new Error(`line ${lineNum} aggregate ${i} expected value "${aggregates[i]}", got "${aggregate}"`);
            }
        }

        const children = new Map(w.getChildren(id).map(childId => [
            expanderFromId(w, childId),
            childId
        ]));
        stack.push(children);
        while (stack.length !== 0 && stack[stack.length - 1].size === 0) {
            stack.pop();
        }
    }

    if (stack.length !== 0) {
        throw new Error('unmatched children');
    }
}

export async function testAggregateWorkerSimple() {
    const w = new AggregateWorker({
        columns: createColumns(
            ['number', 'string'],
            '0|a',
            '0|b',
            '1|c',
            '1|d',
        ),
        expanders: [0, 1],
        aggregators: [{ name: 'sum', args: [0]}],
    });
    assertTree(
        w,
        '    | 2',
        '0   | 0',
        ' a  | 0',
        ' b  | 0',
        '1   | 2',
        ' c  | 1',
        ' d  | 1',
    );
}

export async function testAggregateWorkerStack() {
    const w = new AggregateWorker({
        columns: createColumns(
            ['stringStack', 'stringStack', 'number'],
            '||1',
            'a||2',
            '|a|3',
        ),
        expanders: [0, 1],
        aggregators: [
            { name: 'sum', args: [2]},
            { name: 'count', args: []},
        ],
    });
    assertTree(
        w,
        '   | 6 | 3',
        'a  | 2 | 1',
        ' a | 3 | 1',
    );
}
