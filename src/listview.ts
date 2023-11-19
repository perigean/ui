import { OpaqueRenderedElement, State, uiComponent } from "./ui.js";

import { HTMLElementAttributes, div } from "./dom.js"

// TODO: llistview of dygraph to see if it's fast.

export interface ListViewData<T> {
    get: (i: number) => T;
    onChange?: () => void;
    count: number;
    rowHeight: number;
    renderRange: number;
}

type VirtualRow<T> = {
    s: State<T>;
    i: number;
    iState: State<string>;
};

const VirtualRows = uiComponent(function VirtualRows<T>(rows: State<VirtualRow<T>[]>, rowCount: State<number>, rowHeight: number, renderRow: (s: State<T>, attributes: HTMLElementAttributes) => OpaqueRenderedElement): HTMLElement {
    return div(
        {style: { display: 'grid', gridTemplateRows: `repeat(${rowCount.get()}, ${rowHeight}px)`}},
        ...rows.get().map(r => renderRow(r.s, { style: { gridRow: r.iState } })),
    );
});

export const ListView = uiComponent(function ListView<T>(attributes: HTMLElementAttributes, data: ListViewData<T>, renderRow: (s: State<T>, attributes: HTMLElementAttributes) => OpaqueRenderedElement): HTMLElement {
    const rowCount = new State<number>(data.count);
    let rows: {s: State<T>, i: number, iState: State<string>}[] = [];
    const rowsState = new State<VirtualRow<T>[]>(rows);
    const scroller = div({}, VirtualRows(rowsState, rowCount, data.rowHeight, renderRow));

    const viewport = div(attributes, scroller);
    viewport.style.overflowY = 'scroll';
    
    function updateRows() { 
        const newNumRows = Math.min(
            Math.ceil(viewport.clientHeight * data.renderRange / data.rowHeight),
            data.count,
        );
        const newTopRow = Math.min(
            Math.max(
                Math.floor((viewport.scrollTop - viewport.clientHeight * (data.renderRange - 1) * 0.5) / data.rowHeight),
                0,
            ),
            data.count - newNumRows,
        );
        const neededIndices = new Set<number>();
        for (let i = 0; i < newNumRows; i++) {
            neededIndices.add(newTopRow + i);
        }
        const freshRows: VirtualRow<T>[] = [];
        const staleRows: VirtualRow<T>[] = [];
        for (const row of rows) {
            if (neededIndices.delete(row.i)) {
                // Row was at a needed index, so it's fresh.
                freshRows.push(row);
            } else {
                staleRows.push(row);
            }
        }
        // Update stale rows and add new ones if we run out of stale ones to reuse.
        let rowAdded = false;
        for (const i of neededIndices) {
            const staleRow = staleRows.pop();
            if (staleRow !== undefined) {
                staleRow.i = i;
                staleRow.iState.set(`${i}`);
                staleRow.s.set(data.get(i));
                freshRows.push(staleRow);
            } else {
                rowAdded = true;
                const iState = new State<string>(`${i}`);
                const s = new State<T>(data.get(i));
                freshRows.push({s, i, iState});
            }
        }
        if (freshRows.length === rows.length) {
            // We can re-use rows, since we didn't create or delete any row.
            if (staleRows.length !== 0 || rowAdded) {
                throw new Error('some rows added or left stale');
            }
            // No need to do anything, since the contents of rows have been mutated.
        } else {
            // We need to re-render VirtualRows, since we added or removed some rendered rows.
            rowsState.set(freshRows);
        }
    };

    viewport.addEventListener('scroll', ev => {
        updateRows();
    });
    const ro = new ResizeObserver((_entries: ResizeObserverEntry[]) => {
        updateRows();
    });
    ro.observe(viewport);

    // TODO: make scroller, which uses State to capture how many containers get rendered.
    // TODO: listen to resize events on scroller, which sets the virtual window size (this has to be done via State, since it will render)
    // TODO: make container divs

    return viewport;
});

