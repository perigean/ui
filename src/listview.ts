import { OpaqueRenderedElement, State, uiComponent, uiState } from "./ui.js";

import { HTMLElementAttributes, HTMLElementStyleAttributes, div } from "./dom.js"

// TODO: llistview of dygraph to see if it's fast.

export interface ListViewData<T> {
    get: (i: number) => T;
    // TODO: register and unregister listeners, this asyngenerator is akward.
    freshData: () => AsyncGenerator<number>;
    // TODO: method to tell datasource what the scroll position is.
};

type VirtualRow<T> = {
    s: State<T>;
    i: State<number>;
    style: HTMLElementStyleAttributes;
};

function indexToGridRow(r: number): string {
    return (r + 2).toString();
}

const VirtualRows = uiComponent(function VirtualRows<T>(
    dataCount: State<number>,
    rows: State<VirtualRow<T>[]>,
    rowHeight: number,
    renderRow: (s: State<T>, style: HTMLElementStyleAttributes) => OpaqueRenderedElement,
    renderHeader: ((style: HTMLElementStyleAttributes) => OpaqueRenderedElement) | undefined,
): HTMLElement {
    const children: OpaqueRenderedElement[] = [];
    let headerTemplate = '0px';
    if (renderHeader !== undefined) {
        children.push(renderHeader({ gridRow: '1', position: 'sticky', top: '0px'}));
        headerTemplate = `${rowHeight}px`;
    }
    for (const row of rows.get()) {
        children.push(renderRow(row.s, row.style));
    }
    return div(
        {
            style: {
                display: 'grid',
                gridTemplateRows: dataCount.map(c => `${headerTemplate} repeat(${c}, ${rowHeight}px)`),
            }
        },
        ...children,
    );
});

export const ListView = uiComponent(function ListView<T>(
    attributes: HTMLElementAttributes,
    data: ListViewData<T>,
    rowHeight: number,
    renderRange: number,
    renderRow: (s: State<T>, style: HTMLElementStyleAttributes) => OpaqueRenderedElement,
    renderHeader: ((attributes: HTMLElementStyleAttributes) => OpaqueRenderedElement) | undefined = undefined,
): HTMLElement {
    // State.
    const dataCount = uiState<number>('dataCount', 0);
    const virtualRows = uiState<VirtualRow<T>[]>('virtualRows', []);

    // Containers.
    const scroller = div({}, VirtualRows(dataCount, virtualRows, rowHeight, renderRow, renderHeader));
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

        //Find rows with the right indices.
        // NB: For some reason, this stops run-away scrolling. It's like the scroller wants to follow attached elements or something.
        // TODO: figure out why this is. Also, maybe experiment with detaching elements during mutation by binding to see if it helps.
        // const staleArray: VirtualRow<T>[] = []; // Array of completely stale VirtualRows, s and i don't match anything in freshVirtualRows.
        // for (const sameValue of staleMap.values()) {
        //     for (const vr of sameValue) {
        //         const vri = vr.i.get();
        //         const i = vri - freshTopIndex;
        //         if (i > 0 && i < freshVirtualCount && freshVirtualRows[i] === undefined) {
        //             vr.s.set(data.get(vri));
        //             freshVirtualRows[i] = vr;
        //         } else {
        //             staleArray.push(vr);
        //         }
        //     }
        // }
        const staleArray = [...staleMap.values()].flat(1);

        // Fill in the rest of the rows.
        let madeNewVirtualRow = false;
        for (let i = 0; i < freshVirtualCount; i++) {
            if (freshVirtualRows[i] === undefined) {
                const vri = i + freshTopIndex;
                const vrs = data.get(vri);
                if (staleArray.length > 0) {
                    const vr = staleArray.pop() as VirtualRow<T>;
                    vr.i.set(vri);
                    vr.s.set(vrs);
                    freshVirtualRows[i] = vr;
                } else {
                    const vriState = new State(vri);
                    freshVirtualRows[i] = {
                        s: new State(vrs),
                        i: vriState,
                        // Cache style, so we don't have to compare them in the re-render.
                        style: { gridRow: vriState.map(indexToGridRow) },
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

type GridColumn<T> = {
    renderCell: (s: State<T>, style: HTMLElementStyleAttributes) => (HTMLElement | OpaqueRenderedElement),    // TODO: forbid returning OpaqueRenderedElement so that we can't have components in there?
    renderHeader: (style: HTMLElementStyleAttributes) => (HTMLElement | OpaqueRenderedElement),
    gridTemplateColumn: string,
};

export function GridView<ColumnsT extends any[]>(
    attributes: HTMLElementAttributes,
    data: ListViewData<ColumnsT>,
    rowHeight: number,
    renderRange: number,
    columns: {[K in keyof ColumnsT]: GridColumn<ColumnsT[K]>},
): OpaqueRenderedElement {
    const gridTemplateColumns = columns.map(c => c.gridTemplateColumn).join(' ');
    const columnStyles: HTMLElementStyleAttributes[] = columns.map((_, i) => ({gridColumn: `${i + 1}`}));   // TODO: grid lines etc.
    const columnData: {[K in keyof ColumnsT]: (d: ColumnsT) => ColumnsT[K]} = columns.map((_, i) => ((d: ColumnsT) => d[i])) as any;    // TODO: can we make this typecheck?

    const renderRow = uiComponent(function renderRow(s: State<ColumnsT>, style: HTMLElementStyleAttributes): HTMLElement {
        return div(
            {
                style: {
                    display: 'grid',
                    gridTemplateColumns,
                    ...style,
                },
                
            },
            // NB: state.trigger will return the same State if the same f is passed, so renderCell will get the same args on a re-render.
            ...columns.map((c, i) => c.renderCell(s.trigger(columnData[i]), columnStyles[i])),
        );
    });
    const renderHeader = uiComponent(function renderHeader(style: HTMLElementStyleAttributes): HTMLElement {
        return div(
            {
                style: {
                    display: 'grid',
                    gridTemplateColumns,
                    ...style,
                },
            },
            ...columns.map((c, i) => c.renderHeader(columnStyles[i])),
        );
    });
    return ListView(attributes, data, rowHeight, renderRange, renderRow, renderHeader);
}
