import { RenderedElement, State, uiComponent } from "./ui.js";

export interface ListViewDataSource<T> {
    get(i: number): T;
    count(): number;
    // TODO: way to regiseter change notifications
}

const ListView = uiComponent(0, <T>(rowHeight: number, dataSource: ListViewDataSource<T>, renderRow: (s: State<T>) => RenderedElement): HTMLElement => {
    // TODO: make container
    // TODO: make scroller, which uses State to capture how many containers get rendered.
    // TODO: listen to resize events on scroller, which sets the virtual window size (this has to be done via State, since it will render)
    // TODO: make container divs
});
