import { OpaqueRenderedElement, State, uiComponent, uiState } from "./ui.js";

import { HTMLElementAttributes, div } from "./dom.js"

// TODO: llistview of dygraph to see if it's fast.

export interface ListViewData<T> {
    get: (i: number) => T;
    freshData: () => AsyncGenerator<number>;
};

type VirtualRow<T> = {
    s: State<T>;
    i: State<number>;  // TODO: get ris of i, only iState, used mapped state for setting gridRow.
};

function rowToGridRow(r: number): string {
    return (r + 1).toString();
}

const VirtualRows = uiComponent(function VirtualRows<T>(dataCount: State<number>, rows: State<VirtualRow<T>[]>, rowHeight: number, renderRow: (s: State<T>, attributes: HTMLElementAttributes) => OpaqueRenderedElement): HTMLElement {
    return div(
        {style: { display: 'grid', gridTemplateRows: dataCount.map(c => `repeat(${c}, ${rowHeight}px)`) }},
        ...rows.get().map(r => renderRow(r.s, { style: { gridRow: r.i.map(rowToGridRow) } })),
    );
});

export const ListView = uiComponent(function ListView<T>(attributes: HTMLElementAttributes, data: ListViewData<T>, rowHeight: number, renderRange: number, renderRow: (s: State<T>, attributes: HTMLElementAttributes) => OpaqueRenderedElement): HTMLElement {
    // State.
    const dataCount = uiState<number>('dataCount', 0);
    const virtualRows = uiState<VirtualRow<T>[]>('virtualRows', []);

    // Containers.
    const scroller = div({}, VirtualRows(dataCount, virtualRows, rowHeight, renderRow));
    const viewport = div(attributes, scroller);
    viewport.style.overflowY = 'scroll';
    
    function updateRows() {
        const count = dataCount.get();
        // What we have, keyed by value, then index?
        const freshVirtualCount = Math.min(
            Math.ceil(viewport.clientHeight * renderRange / rowHeight),
            count,
        );
        const freshTopIndex = Math.min(
            Math.max(
                Math.floor((viewport.scrollTop - viewport.clientHeight * (renderRange - 1) * 0.5) / rowHeight),
                0,
            ),
            count - freshVirtualCount,
        );
        const staleVirtualRows: VirtualRow<T>[] = virtualRows.get();
        const freshVirtualRows: (VirtualRow<T> | undefined)[] = new Array(freshVirtualCount);
        const staleMap = new Map<T, VirtualRow<T>[]>();
        for (let i = 0; i < staleVirtualRows.length; i++) {
            const vr = staleVirtualRows[i];
            const vri = vr.i.get();
            const vrs = vr.s.get();
            if (vri >= freshTopIndex && vri < freshTopIndex + freshVirtualCount && vrs === data.get(vri)) {
                // Row position and data value are fresh, copy to output.
                freshVirtualRows[vri - freshTopIndex] = vr;
            } else {
                // Row index or value is stale, put in staleMap for processing.
                let sameValue = staleMap.get(vrs);
                if (sameValue === undefined) {
                    sameValue = [];
                    staleMap.set(vrs, sameValue);
                }
                sameValue.push(vr);
            }
        }

        // Find rows with the right values.
        for (let i = 0; i < freshVirtualCount; i++) {
            if (freshVirtualRows[i] === undefined) {
                // We need a row here, is there already one with the right value?
                const sameValue = staleMap.get(data.get(freshTopIndex + i));
                if (sameValue !== undefined && sameValue.length > 0) {
                    const vr = sameValue.pop() as VirtualRow<T>;
                    vr.i.set(i + freshTopIndex);
                    freshVirtualRows[i] = vr;
                }
            }
        }

        // Fill in the rest of the rows.
        const staleArray = [...staleMap.values()].flat(1);
        let madeNewVirtualRow = false;
        for (let i = 0; i < freshVirtualCount; i++) {
            if (freshVirtualRows[i] === undefined) {
                const vri = i + freshTopIndex;
                const vrs = data.get(vri);
                if (staleArray.length > 0) {
                    const vr = staleArray.pop() as VirtualRow<T>;
                    vr.i.set(vri);
                    vr.s.set(vrs);
                } else {
                    freshVirtualRows[i] = {
                        s: new State<T>(vrs),
                        i: new State<number>(vri),
                    };
                    madeNewVirtualRow = true;
                }
            }
        }

        if (madeNewVirtualRow || staleArray.length > 0) {
            // We made new rows, or didn't use all the stale ones, so the number of rows changed.
            // We need to re-render VirtualRows.
            virtualRows.set(freshVirtualRows as VirtualRow<T>[]);
        }
    };

    viewport.addEventListener('scroll', ev => {
        updateRows();
    });
    const ro = new ResizeObserver((_entries: ResizeObserverEntry[]) => {
        updateRows();
    });
    ro.observe(viewport);

    // TODO: This will leak, cancel this iteration when unmounted.
    const freshData = data.freshData();

    (async () => {
         for await (const count of freshData) {
            dataCount.set(count);
            updateRows();
         }
    })();

    return viewport;
});

