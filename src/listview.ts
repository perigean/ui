import { RenderedElement, State, uiComponent, uiSetState } from "./ui.js";

import { Attributes, div } from "./dom.js"

export interface ListViewData<T> {
    get: (i: number) => T;
    onChange?: () => void;
    count: number;
    rowHeight: number;
    renderRange: number;
}

type VirtualRow<T> = {
    s: State<T>;
    top: State<string>;
};

const VirtualRows = uiComponent(1, function Scroller<T>(rows: VirtualRow<T>[], rowHeight: number, scrollHeight: State<string>, renderRow: (s: State<T>, attributes: Attributes) => RenderedElement): HTMLElement {
    return div(
        {style: { height: scrollHeight }},
        ...rows.map(r => renderRow(r.s, { style: { position: 'absolute', top: r.top, height: `${rowHeight}px`} })),
    );
});

export const ListView = uiComponent(0, function ListView<T>(attributes: Attributes, data: ListViewData<T>, renderRow: (s: State<T>, attributes: Attributes) => RenderedElement): HTMLElement {
    const rowsHeight = new State<string>(`${data.rowHeight * data.count}px`);
    let rows: {s: State<T>, top: State<string>, i: number}[] = [];
    const rowsState = new State<VirtualRow<T>[]>(rows);
    const scroller = div({}, VirtualRows(rowsState, data.rowHeight, rowsHeight, renderRow));

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
        const freshRows: {s: State<T>, top: State<string>, i: number}[] = [];
        const staleRows: {s: State<T>, top: State<string>, i: number}[] = [];
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
                uiSetState(staleRow.top, `${i * data.rowHeight}px`);
                uiSetState(staleRow.s, data.get(i));
                freshRows.push(staleRow);
            } else {
                rowAdded = true;
                const top = new State<string>(`${i * data.rowHeight}px`);
                const s = new State<T>(data.get(i));
                freshRows.push({s, top, i});
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
            uiSetState(rowsState, freshRows);
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

