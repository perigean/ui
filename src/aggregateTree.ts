// TODO: API for tree:
// On webworker:
// * async structure and query values. no sorting or 
// getExpander(nodeId, expanderId, frame, priority)
// getAggregate(nodeId, aggregateId, priority)
// getChildren(nodeId, priority)
// Each call causes a callback to be run. somehow.
// priority higher is more priority, 0 or below means cancel.

import { HTMLElementStyleAttributes, div } from "./dom.js";
import { OpaqueRenderedElement, State } from "./ui.js";

// On the main thread, expose the same API, but have it be non-blocking but it can return undefined or whatever.

// priorities is communicated by the scroll view (visible and pre-render), as well as maybe selected element (so we can do children)
// update functions should be: row update with index, or structure update

interface DataArray<T> {
    length: number;
    [n: number]: T;
};

// TODO: different typed columns. It's probably too annoying to enforce the types in the type system, so have a type field and then throw on setup.



// type Int8Column = {
//     type: 'Int8Array';
//     data: Int8Array;
// };

// type Int16Column = {
//     type: 'Int16Array';
//     data: Int16Array;
// };

// type StringColumn = {
//     type: 'String';
//     data: string[];
// };

// type StringStackColumn = {
//     type: 'StringStack';
//     data: number[];
//     frames: string[][];
// };

export type SimpleColumn<T, TypeNameT extends string> = {
    type: string;
    stack: false;
    data: DataArray<T>;
};
export type StackColumn<T, TypeNameT extends string> = {
    type: string;
    stack: true;
    data: DataArray<number>;
    frames: DataArray<DataArray<T>>;
}

export type Column<T = any, TypeNameT extends string = string> = SimpleColumn<T, TypeNameT> | StackColumn<T, TypeNameT>;


// TODO: for all types of things, we register and then use a string (instead of passing a direct reference to the thing (column constructor, aggregator, etc.))
// TODO: use this style to register aggregates, columns, aggregators, (orderings?)
// TODO: how to get this into the web worker? I guess have a dynamic import method?

type ColumnDefinition<NameT extends string, ValueT extends any> = {
    name: NameT;
    printer: (value: ValueT) => string;
};

const columnRegistry = new Map<string, ColumnDefinition<string, any>>();
export function registerColumn<
    ValueT extends any,    
    NameT extends string,
>(
    name: NameT,
    printer: (value: ValueT) => string,
) {
    if (columnRegistry.has(name)) {
        throw new Error(`"${name}" column already exists`);
    }
    columnRegistry.set(name, {name, printer});
}
export function lookupColumnPrinter<ValueT extends any, NameT extends string = string>(name: NameT): (value: ValueT) => string {
    const def = columnRegistry.get(name);
    if (def === undefined) {
        throw new Error(`"${name}" column does not exist`);
    }
    return def.printer;
}

type AggregateDefinition<NameT extends string, AggregateT extends { type: NameT }> = {
    name: NameT;
    render: (style: HTMLElementStyleAttributes, aggregate: State<undefined | AggregateT>) => OpaqueRenderedElement;
    printer: (a: AggregateT) => string;
};

const aggregateRegistry = new Map<string, AggregateDefinition<string, { type: string }>>();
export function registerAggregate<
    AggregateT extends { type: NameT },    
    NameT extends string,
>(
    name: NameT,
    render: (style: HTMLElementStyleAttributes, aggregate: State<undefined | AggregateT>) => OpaqueRenderedElement,
    printer: (a: AggregateT) => string,
) {
    if (aggregateRegistry.has(name)) {
        throw new Error(`${name} aggregate already exists`);
    }
    aggregateRegistry.set(name, {name, render: render as any, printer: printer as any}); // TODO: why does this not typecheck?
};

export function lookupAggregateRenderer<
    AggregateT extends { type: NameT },    
    NameT extends string = string,
>(name: NameT): (style: HTMLElementStyleAttributes, aggregate: State<undefined | AggregateT>) => OpaqueRenderedElement {
    const def = aggregateRegistry.get(name);
    if (def === undefined) {
        throw new Error(`"${name}" aggregate does not exist`);
    }
    return def.render as any;
}

export function lookupAggregatePrinter<
    AggregateT extends { type: NameT },    
    NameT extends string = string,
>(name: NameT): (a: AggregateT) => string {
    const def = aggregateRegistry.get(name);
    if (def === undefined) {
        throw new Error(`"${name}" aggregate does not exist`);
    }
    return def.printer;
}

type AggregatorDefinition<
    AggregateT extends { type: string },
    ColumnsT extends { type: string, stack: boolean }[],
> = {
    name: string;
    columnTypes: [...{ [K in keyof ColumnsT]: [type: ColumnsT[K]['type'], stack: ColumnsT[K]['stack']] }];
    aggregateName: AggregateT['type'];
    f: (rowBegin: number, rowEnd: number, ...columns: [...ColumnsT]) => AggregateT;
};

const aggregatorRegistry = new Map<string, AggregatorDefinition<{type: string}, {type: string, stack: boolean}[]>>();
export function registerAggregator<
    AggregateT extends { type: string },
    ColumnsT extends { type: string, stack: boolean }[],
>(
    name: string,
    aggregateType: AggregateT['type'],
    columnTypes: [...{ [K in keyof ColumnsT]: [type: ColumnsT[K]['type'], stack: ColumnsT[K]['stack']] }],
    f: (rowBegin: number, rowEnd: number, ...columns: ColumnsT) => AggregateT,
) {
    if (aggregatorRegistry.has(name)) {
        throw new Error(`"${name}" aggregator already exists`);
    }
    for (const columnType of columnTypes) {
        if (!columnRegistry.has(columnType[0])) {
            throw new Error(`"${name}" aggregator depends on unknown column type "${columnType}"`);
        }
    }
    if (!aggregateRegistry.has(aggregateType)) {
        throw new Error(`"${name}" aggregator depends on unknown aggregate type "${aggregateType}"`)
    }
    const definition: AggregatorDefinition<AggregateT, ColumnsT> = {name, columnTypes, aggregateName: aggregateType, f};
    aggregatorRegistry.set(name, definition as any);    // TODO: Why doesn't this typecheck? Maybe because number of parameters can be different?
};
export function lookupAggregatorFunction<
    AggregateT extends { type: string },
    ColumnsT extends { type: string, stack: boolean }[] = { type: string, stack: boolean }[],
    NameT extends string = string,
>(
    name: NameT,
    ...columns: ColumnsT
): (rowBegin: number, rowEnd: number, ...columns: [...ColumnsT]) => AggregateT {
    const def = aggregatorRegistry.get(name);
    if (def === undefined) {
        throw new Error(`"${name}" aggregator does not exist`);
    }
    if (def.columnTypes.length !== columns.length) {
        throw new Error(`"${name} aggregator takes ${def.columnTypes.length} columns, got ${columns.length}`);
    }
    for (let i = 0; i < columns.length; i++) {
        if (def.columnTypes[i][0] !== columns[i].type) {
            throw new Error(`"${name} aggregator column argument ${i} type is "${def.columnTypes[i][0]}", got "${columns[i].type}"`);
        }
        if (def.columnTypes[i][1] !== columns[i].stack) {
            throw new Error(`"${name} aggregator column argument ${i} type is a ${columns[i].stack ? 'stack' : 'simple'} column, got a ${def.columnTypes[i][1]} column`);
        }
    }
    return def.f as any;
}

// TODO: tighter type?
export function lookupAggregatorRenderer(name: string) {
    const def = aggregatorRegistry.get(name);
    if (def === undefined) {
        throw new Error(`"${name}" aggregator does not exist`);
    }
    return lookupAggregateRenderer(def.aggregateName);
}

// type NumberColumn = {
//     type: 'number';
//     data: number[];
// };

// type NumberAggregate = {
//     type: 'number';
//     value: number;
// };

// registerAggregator('sum', 'number', ['number'], (rowBegin: number, rowEnd: number, column: NumberColumn): NumberAggregate => {
//     let value = 0;
//     for (let i = rowBegin; i < rowEnd; i++) {
//         value += column.data[i];
//     }
//     return { type: 'number', value };
// });


//type Indices<T extends any[]> = T extends [any, ...infer RestT] ? Partial<RestT>["length"] : (T extends [] ? never : number);

type AggregateWorkerConfig = {
    columns: Column[];
    expanders: number[];
    aggregators: { name: string, args: number[] }[];
};


type AggregateTreeNode = {
    expander: number;
    frame: number;
    rowBegin: number;       // Inclusive beginning of tree data in columns
    rowEnd: number;         // Exclusive end of tree data in columns
    children?: number[];    // Array of id
};

type AggregateGenerator = (rowBegin: number, rowEnd: number) => {type: string};
function validateAggregateWorkerConfig(config: AggregateWorkerConfig): AggregateGenerator[] {
    // There are some columns.    
    if (config.columns.length === 0) {
        throw new Error('AggregateWorkerConfig has no columns');
    }

    // All columns have the same rows.
    const numRows = config.columns[0].data.length;
    for (let i = 1; i < config.columns.length; i++) {
        if (config.columns[i].data.length !== numRows) {
            throw new Error('AggregateWorkerConfig has columns with mismatched number of rows');
        }
    }

    // All expanders are valid.
    for (const expander of config.expanders) {
        if (config.columns[expander] === undefined) {
            throw new Error(`AggregateWorkerConfig invalid expander ${expander}`);
        }
    }

    // All aggregates have valid columns.
    const generators: AggregateGenerator[] = [];
    for (let aggregateIndex = 0; aggregateIndex < config.aggregators.length; aggregateIndex++) {
        const aggregator = config.aggregators[aggregateIndex];
        const columns: Column[] = [];
        for (const columnIndex of aggregator.args) {
            const column = config.columns[columnIndex];
            if (column === undefined) {
                throw new Error(`AggregateWorkerConfig aggregate ${aggregateIndex} has invalid column ${columnIndex}`);
            }
            columns.push(column);
        }

        const f = lookupAggregatorFunction(aggregator.name, ...columns);
        generators.push((rowBegin, rowEnd) => f(rowBegin, rowEnd, ...columns));
    }
    return generators;
}

export class AggregateWorker {
    private config: AggregateWorkerConfig;
    private frameGetter: ((frame: number, row: number) => (any | undefined))[];
    private id: Map<number, AggregateTreeNode>;
    private rowCount: number;
    private aggregateGenerators: AggregateGenerator[];

    private makeNode(expander: number, frame: number, rowBegin: number, rowEnd: number): number {
        const id = this.id.size;
        const node = { expander, frame, rowBegin, rowEnd };
        this.id.set(id, node);
        return id;
    }

    private shuffleRows(begin: number, shuffle: number[]) {
        // TODO: do this without scratch? Does it matter? Keep scratch around to re-use it?
        const scratch = new Array(shuffle.length);
        for (const column of this.config.columns) {
            const data = column.data;
            for (let i = 0; i < shuffle.length; i++) {
                scratch[i] = data[shuffle[i]];
            }
            for (let i = 0; i < shuffle.length; i++) {
                data[begin + i] = scratch[i];
            }
        }
    }

    private getChildrenImpl(expander: number, frame: number, rowBegin: number, rowEnd: number): number[] {
        if (expander >= this.frameGetter.length) {
            return [];
        }
        const column = this.config.columns[this.config.expanders[expander]];
        const frameGetter = this.frameGetter[expander];
        // Build a map that sorts rows based on the expander value.
        const sameValue = new Map<any | undefined, number[]>(); // expander value => list of rows with that value.
        for (let i = rowBegin; i < rowEnd; i++) {
            const value = frameGetter(frame, i);
            
            const rows = sameValue.get(value);
            if (rows === undefined) {
                sameValue.set(value, [i]);
            } else {
                rows.push(i);
            }
        }
        // Reorder all columns based on sameValue.
        const shuffle: number[] = [];
        const children: number[] = [];
        let nextExpanderRange: null | {begin: number, end: number} = null;
        for (const [value, rows] of sameValue.entries()) {
            const childRowBegin = rowBegin + shuffle.length;
            const childRowEnd = childRowBegin + rows.length;
            if (value === undefined) {
                nextExpanderRange = {
                    begin: childRowBegin,
                    end: childRowEnd,
                };
            } else {
                children.push(this.makeNode(expander, frame, childRowBegin, childRowEnd));
            }
            shuffle.push(...rows);
        }
        if (shuffle.length !== rowEnd - rowBegin) {
            throw new Error('children rows do not add up to parent row range');
        }
        this.shuffleRows(rowBegin, shuffle);

        // Recursively expand rows that have value === undefined, and append them to children list
        if (nextExpanderRange !== null) {
            children.push(...this.getChildrenImpl(expander + 1, 0, nextExpanderRange.begin, nextExpanderRange.end));
        }
        return children;
    }

    constructor(config: AggregateWorkerConfig) {
        this.aggregateGenerators = validateAggregateWorkerConfig(config);
        this.config = config;
        this.frameGetter = config.expanders.map(i => {
            const column = config.columns[i];
            const data = column.data;
            if (column.stack) {
                return (f, r) => column.frames[data[r]][f];
            } else {
                return (f, r) => (f === 0 ? data[r] : undefined);
            }
        });
        this.id = new Map();
        this.rowCount = config.columns[0].data.length;
        const rootId = this.makeNode(-1, 0, 0, this.rowCount);
        if (rootId !== 0) {
            throw new Error('AggregateWorker root id not 0');
        }
    }

    getChildren(id: number): number[] {
        const node = this.id.get(id);
        if (node === undefined) {
            throw new Error(`${id} is not a valid node ID`);
        }
        if (node.children === undefined) {
            if (id === 0) {
                node.children = this.getChildrenImpl(0, 0, node.rowBegin, node.rowEnd);
            } else {
                node.children = this.getChildrenImpl(node.expander, node.frame + 1, node.rowBegin, node.rowEnd);
            }
        }
        return node.children;
    }

    getAggregate(id: number, aggregateIndex: number): { type: string } {
        const node = this.id.get(id);
        if (node === undefined) {
            throw new Error(`${id} is not a valid node ID`);
        }
        const f = this.aggregateGenerators[aggregateIndex];
        if (f === undefined) {
            throw new Error(`${aggregateIndex} is not a valid aggregate index`);
        }
        return f(node.rowBegin, node.rowEnd);
    }

    getValue(id: number): { type: string, value: any, expander: number, frame: number } {
        const node = this.id.get(id);
        if (node === undefined) {
            throw new Error(`${id} is not a valid node ID`);
        }
        const expander = node.expander;
        const frame = node.frame;
        if (expander === -1) {
            return {
                type: 'root',
                value: 'root',
                expander,
                frame,
            };
        }
        const type = this.config.columns[this.config.expanders[node.expander]].type;
        const value = this.frameGetter[node.expander](node.frame, node.rowBegin);
        return { type, value, expander, frame };
    }
};
