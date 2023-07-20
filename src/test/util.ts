import { RenderedElement, State, uiComponent } from "../ui.js";

export function assertEq<T>(a: T, b: T) {
    if (a === b) {
        return;
    }
    throw new Error(`Expected "${a}" === "${b}"`);
}

export function assertTrue(b: boolean) {
    if (b) {
        return;
    }
    throw new Error(`Expected "${b}" to be true`);
}

export function renderCounter(counter: {i: number}): (id: State<string>) => RenderedElement {
    return uiComponent(1, (id: string): HTMLElement => {
        counter.i++;
        const e = document.createElement('div');
        e.id = id;
        return e;
    });
}

export function domText(e: Element | null, indent: string = ''): string {
    if (e === null) {
        throw new Error('e is null');
    }
    const tagName = e.tagName.toLowerCase();
    let text = `\n${indent}<${tagName}${e.id === '' ? '' : ` id="${e.id}"`}>`;
    for (let i = 0; i < e.children.length; i++) {
        const child = e.children.item(i);
        text += domText(child, indent + '  ');
    }
    text += `\n${indent}</${tagName}>`;
    return text;
}
