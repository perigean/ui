// TODO: DOM api should just deal with HTMLElements and not have anything to do with components, just bindings.

import { MappedState, OpaqueRenderedElement, State, uiBind } from "./ui.js";

type Gettable<T> = State<T> | MappedState<any, T>;

type Equals<X, Y> =
    (<T> () => T extends X ? 1 : 2) extends
        (<T> () => T extends Y ? 1 : 2)
            ? true
            : false

type Writeable<O extends Record<any, any>, P extends keyof O> = Equals<{[_ in P]: O[P]}, {-readonly [_ in P]: O[P]}>;

type WriteableStyleKey = {
    [K in keyof CSSStyleDeclaration]: Writeable<CSSStyleDeclaration, K> extends true ? (K extends string ? (CSSStyleDeclaration[K] extends string ? K : never) : never) : never;
}[keyof CSSStyleDeclaration];

export type HTMLElementStyleAttributes = {
    [K in WriteableStyleKey]?: string | State<string> | MappedState<any, string>;
}

function applyStyles(e: HTMLElement, style: HTMLElementStyleAttributes) {
    let bindState: (State<string> | MappedState<any, string>)[] | undefined;
    let bindName: string[] | undefined;
    for (const name in style) {
        if (Object.hasOwn(style, name)) {
            const value = (style as any)[name];
            if (value instanceof State || value instanceof MappedState) {
                (bindState = bindState || []).push(value);
                (bindName = bindName || []).push(name);
            } else if (value !== undefined) {
                (e.style as any)[name] = value;
            }
        }
    }
    if (bindState !== undefined && bindName !== undefined) {
        const bindStateNotUndefined = bindState;
        const bindNameNotUndefined = bindName;
        uiBind(e, e => {
            const estyle: any = e.style;
            for (let i = 0; i < bindStateNotUndefined.length; i++) {
                estyle[bindNameNotUndefined[i]] = bindStateNotUndefined[i].get();
            }
        });
    }
}

type HTMLElementAttribute<AttributeT>
    = AttributeT
    | State<AttributeT>
    | MappedState<any, AttributeT>;

type HTMLElementEventListenerAttribute<EventT>
    = ((this: HTMLElement, ev: EventT) => any)
    | State<(this: HTMLElement, ev: EventT) => any>
    | MappedState<any, (this: HTMLElement, ev: EventT) => any>;

// The base set of attributes shared by all HTML Elements.
type HTMLElementAttributesBase = {
    style?: HTMLElementStyleAttributes;

    accessKey?: HTMLElementAttribute<string>;
    autocapitalize?: HTMLElementAttribute<string>;
    dir?: HTMLElementAttribute<string>;
    draggable?: HTMLElementAttribute<boolean>;
    hidden?: HTMLElementAttribute<boolean>;
    inert?: HTMLElementAttribute<boolean>;
    innerText?: HTMLElementAttribute<string>;
    lang?: HTMLElementAttribute<string>;
    popover?: HTMLElementAttribute<string | null>;
    spellcheck?: HTMLElementAttribute<boolean>;
    title?: HTMLElementAttribute<string>;
    translate?: HTMLElementAttribute<boolean>;

    contentEditable?: HTMLElementAttribute<string>;
    enterKeyHint?: HTMLElementAttribute<string>;
    inputMode?: HTMLElementAttribute<string>;

    autofocus?: HTMLElementAttribute<boolean>;
    tabIndex?: HTMLElementAttribute<number>;

    className?: HTMLElementAttribute<string>;
    id?: HTMLElementAttribute<string>;
    scrollLeft?: HTMLElementAttribute<number>;
    scrollTop?: HTMLElementAttribute<number>;
    slot?: HTMLElementAttribute<string>;

    textContent?: HTMLElementAttribute<string | null>;

    ariaAtomic?: HTMLElementAttribute<string | null>;
    ariaAutoComplete?: HTMLElementAttribute<string | null>;
    ariaBusy?: HTMLElementAttribute<string | null>;
    ariaChecked?: HTMLElementAttribute<string | null>;
    ariaColCount?: HTMLElementAttribute<string | null>;
    ariaColIndex?: HTMLElementAttribute<string | null>;
    ariaColSpan?: HTMLElementAttribute<string | null>;
    ariaCurrent?: HTMLElementAttribute<string | null>;
    ariaDisabled?: HTMLElementAttribute<string | null>;
    ariaExpanded?: HTMLElementAttribute<string | null>;
    ariaHasPopup?: HTMLElementAttribute<string | null>;
    ariaHidden?: HTMLElementAttribute<string | null>;
    ariaInvalid?: HTMLElementAttribute<string | null>;
    ariaKeyShortcuts?: HTMLElementAttribute<string | null>;
    ariaLabel?: HTMLElementAttribute<string | null>;
    ariaLevel?: HTMLElementAttribute<string | null>;
    ariaLive?: HTMLElementAttribute<string | null>;
    ariaModal?: HTMLElementAttribute<string | null>;
    ariaMultiLine?: HTMLElementAttribute<string | null>;
    ariaMultiSelectable?: HTMLElementAttribute<string | null>;
    ariaOrientation?: HTMLElementAttribute<string | null>;
    ariaPlaceholder?: HTMLElementAttribute<string | null>;
    ariaPosInSet?: HTMLElementAttribute<string | null>;
    ariaPressed?: HTMLElementAttribute<string | null>;
    ariaReadOnly?: HTMLElementAttribute<string | null>;
    ariaRequired?: HTMLElementAttribute<string | null>;
    ariaRoleDescription?: HTMLElementAttribute<string | null>;
    ariaRowCount?: HTMLElementAttribute<string | null>;
    ariaRowIndex?: HTMLElementAttribute<string | null>;
    ariaRowSpan?: HTMLElementAttribute<string | null>;
    ariaSelected?: HTMLElementAttribute<string | null>;
    ariaSetSize?: HTMLElementAttribute<string | null>;
    ariaSort?: HTMLElementAttribute<string | null>;
    ariaValueMax?: HTMLElementAttribute<string | null>;
    ariaValueMin?: HTMLElementAttribute<string | null>;
    ariaValueNow?: HTMLElementAttribute<string | null>;
    ariaValueText?: HTMLElementAttribute<string | null>;
    role?: HTMLElementAttribute<string | null>;

    // Event attributes
    onerror?: HTMLElementAttribute<OnErrorEventHandlerNonNull>;

    onabort?: HTMLElementEventListenerAttribute<UIEvent>;
    onanimationcancel?: HTMLElementEventListenerAttribute<AnimationEvent>;
    onanimationend?: HTMLElementEventListenerAttribute<AnimationEvent>;
    onanimationiteration?: HTMLElementEventListenerAttribute<AnimationEvent>;
    onanimationstart?: HTMLElementEventListenerAttribute<AnimationEvent>;
    onauxclick?: HTMLElementEventListenerAttribute<MouseEvent>;
    onbeforeinput?: HTMLElementEventListenerAttribute<InputEvent>;
    onblur?: HTMLElementEventListenerAttribute<FocusEvent>;
    oncancel?: HTMLElementEventListenerAttribute<Event>;
    oncanplay?: HTMLElementEventListenerAttribute<Event>;
    oncanplaythrough?: HTMLElementEventListenerAttribute<Event>;
    onchange?: HTMLElementEventListenerAttribute<Event>;
    onclick?: HTMLElementEventListenerAttribute<MouseEvent>;
    onclose?: HTMLElementEventListenerAttribute<Event>;
    oncontextmenu?: HTMLElementEventListenerAttribute<MouseEvent>;
    oncopy?: HTMLElementEventListenerAttribute<ClipboardEvent>;
    oncuechange?: HTMLElementEventListenerAttribute<Event>;
    oncut?: HTMLElementEventListenerAttribute<ClipboardEvent>;
    ondblclick?: HTMLElementEventListenerAttribute<MouseEvent>;
    ondrag?: HTMLElementEventListenerAttribute<DragEvent>;
    ondragend?: HTMLElementEventListenerAttribute<DragEvent>;
    ondragenter?: HTMLElementEventListenerAttribute<DragEvent>;
    ondragleave?: HTMLElementEventListenerAttribute<DragEvent>;
    ondragover?: HTMLElementEventListenerAttribute<DragEvent>;
    ondragstart?: HTMLElementEventListenerAttribute<DragEvent>;
    ondrop?: HTMLElementEventListenerAttribute<DragEvent>;
    ondurationchange?: HTMLElementEventListenerAttribute<Event>;
    onemptied?: HTMLElementEventListenerAttribute<Event>;
    onended?: HTMLElementEventListenerAttribute<Event>;
    onfocus?: HTMLElementEventListenerAttribute<FocusEvent>;
    onformdata?: HTMLElementEventListenerAttribute<FormDataEvent>;
    ongotpointercapture?: HTMLElementEventListenerAttribute<PointerEvent>;
    oninput?: HTMLElementEventListenerAttribute<Event>;
    oninvalid?: HTMLElementEventListenerAttribute<Event>;
    onkeydown?: HTMLElementEventListenerAttribute<KeyboardEvent>;
    onkeypress?: HTMLElementEventListenerAttribute<KeyboardEvent>;
    onkeyup?: HTMLElementEventListenerAttribute<KeyboardEvent>;
    onload?: HTMLElementEventListenerAttribute<Event>;
    onloadeddata?: HTMLElementEventListenerAttribute<Event>;
    onloadedmetadata?: HTMLElementEventListenerAttribute<Event>;
    onloadstart?: HTMLElementEventListenerAttribute<Event>;
    onlostpointercapture?: HTMLElementEventListenerAttribute<PointerEvent>;
    onmousedown?: HTMLElementEventListenerAttribute<MouseEvent>;
    onmouseenter?: HTMLElementEventListenerAttribute<MouseEvent>;
    onmouseleave?: HTMLElementEventListenerAttribute<MouseEvent>;
    onmousemove?: HTMLElementEventListenerAttribute<MouseEvent>;
    onmouseout?: HTMLElementEventListenerAttribute<MouseEvent>;
    onmouseover?: HTMLElementEventListenerAttribute<MouseEvent>;
    onmouseup?: HTMLElementEventListenerAttribute<MouseEvent>;
    onpaste?: HTMLElementEventListenerAttribute<ClipboardEvent>;
    onpause?: HTMLElementEventListenerAttribute<Event>;
    onplay?: HTMLElementEventListenerAttribute<Event>;
    onplaying?: HTMLElementEventListenerAttribute<Event>;
    onpointercancel?: HTMLElementEventListenerAttribute<PointerEvent>;
    onpointerdown?: HTMLElementEventListenerAttribute<PointerEvent>;
    onpointerenter?: HTMLElementEventListenerAttribute<PointerEvent>;
    onpointerleave?: HTMLElementEventListenerAttribute<PointerEvent>;
    onpointermove?: HTMLElementEventListenerAttribute<PointerEvent>;
    onpointerout?: HTMLElementEventListenerAttribute<PointerEvent>;
    onpointerover?: HTMLElementEventListenerAttribute<PointerEvent>;
    onpointerup?: HTMLElementEventListenerAttribute<PointerEvent>;
    onprogress?: HTMLElementEventListenerAttribute<ProgressEvent>;
    onratechange?: HTMLElementEventListenerAttribute<Event>;
    onreset?: HTMLElementEventListenerAttribute<Event>;
    onresize?: HTMLElementEventListenerAttribute<UIEvent>;
    onscroll?: HTMLElementEventListenerAttribute<Event>;
    onsecuritypolicyviolation?: HTMLElementEventListenerAttribute<SecurityPolicyViolationEvent>;
    onseeked?: HTMLElementEventListenerAttribute<Event>;
    onseeking?: HTMLElementEventListenerAttribute<Event>;
    onselect?: HTMLElementEventListenerAttribute<Event>;
    onselectionchange?: HTMLElementEventListenerAttribute<Event>;
    onselectstart?: HTMLElementEventListenerAttribute<Event>;
    onslotchange?: HTMLElementEventListenerAttribute<Event>;
    onstalled?: HTMLElementEventListenerAttribute<Event>;
    onsubmit?: HTMLElementEventListenerAttribute<SubmitEvent>;
    onsuspend?: HTMLElementEventListenerAttribute<Event>;
    ontimeupdate?: HTMLElementEventListenerAttribute<Event>;
    ontoggle?: HTMLElementEventListenerAttribute<Event>;
    ontouchcancel?: HTMLElementEventListenerAttribute<TouchEvent>;
    ontouchend?: HTMLElementEventListenerAttribute<TouchEvent>;
    ontouchmove?: HTMLElementEventListenerAttribute<TouchEvent>;
    ontouchstart?: HTMLElementEventListenerAttribute<TouchEvent>;
    ontransitioncancel?: HTMLElementEventListenerAttribute<TransitionEvent>;
    ontransitionend?: HTMLElementEventListenerAttribute<TransitionEvent>;
    ontransitionrun?: HTMLElementEventListenerAttribute<TransitionEvent>;
    ontransitionstart?: HTMLElementEventListenerAttribute<TransitionEvent>;
    onvolumechange?: HTMLElementEventListenerAttribute<Event>;
    onwaiting?: HTMLElementEventListenerAttribute<Event>;
    onwebkitanimationend?: HTMLElementEventListenerAttribute<Event>;
    onwebkitanimationiteration?: HTMLElementEventListenerAttribute<Event>;
    onwebkitanimationstart?: HTMLElementEventListenerAttribute<Event>;
    onwebkittransitionend?: HTMLElementEventListenerAttribute<Event>;
};

function createElement<ElementT, AttributesT extends HTMLElementAttributesBase>(tagName: string, attributes: AttributesT, children: (HTMLElement | OpaqueRenderedElement)[] | undefined = undefined): ElementT {
    const e = document.createElement(tagName);

    if (attributes.style !== undefined) {
        applyStyles(e, attributes.style);
    }

    let bindState: (State<any> | MappedState<any, any>)[] | undefined;
    let bindName: string[] | undefined;
    for (const name in attributes) {
        if (Object.hasOwn(attributes, name) && name !== 'style') {
            const value = attributes[name];
            if (value instanceof State || value instanceof MappedState) {
                (bindState = bindState || []).push(value);
                (bindName = bindName || []).push(name);
            } else if (value !== undefined) {
                (e as any)[name] = value;
            }
        }
    }
    if (bindState !== undefined && bindName !== undefined) {
        const bindStateNotUndefined = bindState;
        const bindNameNotUndefined = bindName;
        uiBind(e, e => {
            for (let i = 0; i < bindStateNotUndefined.length; i++) {
                ((e as any)[bindNameNotUndefined[i]] as any) = bindStateNotUndefined[i].get();
            }
        });
    }

    if (children !== undefined) {
        for (const child of children) {
            e.appendChild(child as HTMLElement);
        }
    }
    
    return e as ElementT;
}

export type HTMLElementAttributes = HTMLElementAttributesBase;

export type HTMLDivElementAttributes = HTMLElementAttributesBase;

export function div(attributes: HTMLDivElementAttributes, ...children: (HTMLElement | OpaqueRenderedElement)[]): HTMLDivElement {
    return createElement('div', attributes, children);
}

export type HTMLSpanElementAttributes = HTMLElementAttributesBase;

export function span(attributes: HTMLSpanElementAttributes, ...children: (HTMLElement | OpaqueRenderedElement)[]): HTMLSpanElement {
    return createElement('span', attributes, children);
}

export type HTMLUListElementAttributes = HTMLElementAttributesBase;

export function ul(attributes: HTMLUListElementAttributes, ...children: (HTMLElement | OpaqueRenderedElement)[]): HTMLUListElement {
    return createElement('ul', attributes, children);
}

export type HTMLLIElementAttributes = HTMLElementAttributesBase;

export function li(attributes: HTMLLIElementAttributes, ...children: (HTMLElement | OpaqueRenderedElement)[]): HTMLLIElement {
    return createElement('li', attributes, children);
}

export type HTMLInputElementAttributes = {
    accept?: HTMLElementAttribute<string>;
    alt?: HTMLElementAttribute<string>;
    autocomplete?: HTMLElementAttribute<AutoFill>;
    capture?: HTMLElementAttribute<string>;
    checked?: HTMLElementAttribute<boolean>;
    defaultChecked?: HTMLElementAttribute<boolean>;
    defaultValue?: HTMLElementAttribute<string>;
    dirName?: HTMLElementAttribute<string>;
    disabled?: HTMLElementAttribute<boolean>;
    formAction?: HTMLElementAttribute<string>;
    formEnctype?: HTMLElementAttribute<string>;
    formMethod?: HTMLElementAttribute<string>;
    formNoValidate?: HTMLElementAttribute<boolean>;
    formTarget?: HTMLElementAttribute<string>;
    height?: HTMLElementAttribute<number>;
    indeterminate?: HTMLElementAttribute<boolean>;
    max?: HTMLElementAttribute<string>;
    maxLength?: HTMLElementAttribute<number>;
    min?: HTMLElementAttribute<string>;
    minLength?: HTMLElementAttribute<number>;
    multiple?: HTMLElementAttribute<boolean>;
    name?: HTMLElementAttribute<string>;
    pattern?: HTMLElementAttribute<string>;
    placeholder?: HTMLElementAttribute<string>;
    readOnly?: HTMLElementAttribute<boolean>;
    required?: HTMLElementAttribute<boolean>;
    selectionDirection?: HTMLElementAttribute<"forward" | "backward" | "none" | null>;
    selectionEnd?: HTMLElementAttribute<number | null>;
    selectionStart?: HTMLElementAttribute<number | null>;
    size?: HTMLElementAttribute<number>;
    src?: HTMLElementAttribute<string>;
    step?: HTMLElementAttribute<string>;
    type?: HTMLElementAttribute<string>;
    useMap?: HTMLElementAttribute<string>;
    value?: HTMLElementAttribute<string>;
    valueAsDate?: HTMLElementAttribute<Date | null>;
    valueAsNumber?: HTMLElementAttribute<number>;
    webkitdirectory?: HTMLElementAttribute<boolean>;
    width?: HTMLElementAttribute<number>;
} & HTMLElementAttributesBase;

export function input(attributes: HTMLInputElementAttributes, ...children: (HTMLElement | OpaqueRenderedElement)[]): HTMLInputElement {
    return createElement('input', attributes, children);
}

export type HTMLCanvasElementAttributes = {
    height?: HTMLElementAttribute<number>;
    width?: HTMLElementAttribute<number>;
} & HTMLElementAttributesBase;

export function canvas(attributes: HTMLCanvasElementAttributes, ...children: (HTMLElement | OpaqueRenderedElement)[]): HTMLCanvasElement {
    return createElement('canvas', attributes, children);
}

export type HTMLButtonElementAttributes = {
    disabled?: HTMLElementAttribute<boolean>;
    formAction?: HTMLElementAttribute<string>;
    formEnctype?: HTMLElementAttribute<string>;
    formMethod?: HTMLElementAttribute<string>;
    formNoValidate?: HTMLElementAttribute<boolean>;
    formTarget?: HTMLElementAttribute<string>;
    name?: HTMLElementAttribute<string>;
    type?: HTMLElementAttribute<"submit" | "reset" | "button">;
    value?: HTMLElementAttribute<string>;
} & HTMLElementAttributesBase;

export function button(attributes: HTMLElementAttributes, ...children: (HTMLElement | OpaqueRenderedElement)[]): HTMLButtonElement {
    return createElement('button', attributes, children);
}
