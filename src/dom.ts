// TODO: DOM api should just deal with HTMLElements and not have anything to do with components, just bindings.

import { State } from "./ui.js";

type StateOrValue<T> = State<T> | T;

type StyleAttributes = {
    width: StateOrValue<string>;
    height: StateOrValue<string>;
};

const styleNames: Set<string> = new Set([
    'height',
    'width',
]);

type DivAttributes = {
    class: string;
    style: StyleAttributes;
};

function applyStyle(e: HTMLElement, style: StyleAttributes) {
    for (const name in style) {
        if (!styleNames.has(name)) {
            continue;
        }
        e.style[name as keyof CSSStyleDeclaration] = style[name as keyof StyleAttributes];
    }
}

export function div(attributes: DivAttributes): HTMLDivElement {
    const e = document.createElement('div');

    // TODO: copy attributes over.
    e.style.width
    return e;
}

// Do we want to allow Components to have their children passed in? Probably...

// Keep list of created RenderedElements, at end of rerender or uiRoot, go through each and attach children based on ancestor list in DOM. Error if not attached.

// export function div(bindings: DOMProperties, ...children: RenderedElement[]): RenderedElement {

// }

/*


type UIStyleOpts = {[Key in keyof CSSStyleDeclaration as (CSSStyleDeclaration[Key] extends string ? Key : never)]?: string | State<string>};

interface UIInnerTextOpt {
    innerText?: string | State<string>;
};

// All the nullable things in GlobalEventHandlers, but non-nullable.
type UIEventHandlers = {[Key in keyof GlobalEventHandlers as (null extends GlobalEventHandlers[Key] ? Key : never)]: Exclude<GlobalEventHandlers[Key], null>};

// All the nullable things in GlobalEventHandlers, but optional (not nullable) and can be wrapped in State<>
type UIEventOpts = {
    [Key in keyof UIEventHandlers]?: UIEventHandlers[Key] | State<UIEventHandlers[Key]>;
};

interface UIDivRootOpts extends UIInnerTextOpt, UIEventOpts {};

interface UIDivOpts extends UIDivRootOpts {
    style?: UIStyleOpts;
};

type BindingFromOpts<OptsT> = {
    [Key in keyof OptsT]: State<any> extends OptsT[Key]
        ? Exclude<OptsT[Key], Exclude<OptsT[Key], State<any>>>
         : BindingFromOpts<OptsT[Key]>;
};

type UIDivBindings = BindingFromOpts<UIDivOpts>;

// TODO: move to another file.
const divRootOpts = new Set<keyof UIDivRootOpts>([
    'innerText',

]);

const styleOpts = new Set<keyof UIStyleOpts>([

]);

function applyDivOpts(e: HTMLDivElement, opts: UIDivOpts): UIDivBindings | undefined {
    const bs: UIDivBindings | undefined = undefined;

    return bs;
}




type UIEventHandlerOpts = {[Key in keyof UIEventHandlers]: UIEventHandlers[Key] | State<UIEventHandlers[Key]>};

//type UIElementOptionsHasOpt<OptT extends keyof UIElementOptions> = {[Key in keyof UIElementOptions]: Key extends OptT ? Exclude<UIElementOptions[Key], undefined> : UIElementOptions[Key] };
type UIElementOptionsHasOpt<OptT extends keyof UIElementOptions> = Required<Pick<UIElementOptions, OptT>>;

type UIEventBindFunction<OptT extends keyof UIEventHandlers> = (e: HTMLElement, opts: UIElementOptionsHasOpt<OptT>) => void;
type UIEventBinding<OptT extends keyof UIEventHandlers> = [OptT, UIEventBindFunction<OptT>];
type UIEventBindings = UIEventBinding<any>[];

interface UIElementOptions extends UIEventHandlers {
    style?: UIBindableStyle;
    innerText?: string | State<string>;
};

// TODO: can we make this type safe?
const copyEventHandlers = new Map<keyof UIEventHandlers, UIEventBindFunction<keyof UIEventHandlers>>([
    ['onabort', (e, opts: UIElementOptionsHasOpt<'onabort'>) => e.onabort = opts.onabort],
    ['onanimationcancel', (e, opts) => e.onanimationcancel = opts.onanimationcancel],
]);

function applyStyleOpts(e: HTMLElement, opts?: UIElementOptions): UIStyleBindings {
    const styleBindings: [keyof UIBindableStyle, State<string>][] = [];
    if (opts?.style !== undefined) {
        const style = opts.style;
        const keys = Object.getOwnPropertyNames(style) as (keyof UIBindableStyle)[];
        for (const key of keys) {
            const value = style[key] as (string | State<string>);
            if (value instanceof State) {
                styleBindings.push([key, value]);
            } else {
                e.style[key] = value;
            }
        }
    }
    return styleBindings;
}

function bindStyle(e: HTMLElement, ds: UIDependentState, styleBindings: [keyof UIBindableStyle, State<string>][] | undefined) {
    if (styleBindings === undefined) {
        return;
    }
    for (const [key, s] of styleBindings) {
        e.style[key] = s.get(ds);
    }
}

function applyInnerTextOpt(e: HTMLElement, opts?: UIElementOptions): State<string> | undefined {
    if (opts?.innerText !== undefined) {
        if (opts.innerText instanceof State) {
            return opts.innerText;
        } else {
            e.innerText = opts.innerText;
        }
    }
    return undefined;
}

function bindInnerText(e: HTMLElement, ds: UIDependentState, innerTextBinding: State<string> | undefined) {
    if (innerTextBinding === undefined) {
        return;
    }
    e.innerText = innerTextBinding.get(ds);
}

function bindDiv(innerTextBinding: State<string> | undefined, styleBindings: UIStyleBindings | undefined) {
    return (e: HTMLElement, ds: UIDependentState) => {
        bindStyle(e, ds, styleBindings);
        bindInnerText(e, ds, innerTextBinding);
    };
}

function div(opts?: UIElementOptions): HTMLDivElement {
    const e = document.createElement('div');
    uiBind(e, bindDiv(
        applyInnerTextOpt(e, opts),
        applyStyleOpts(e, opts),
    ));
    return e;
}

export const ui = {
    div,
};
*/
