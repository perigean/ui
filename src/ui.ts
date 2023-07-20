
const stateValue: unique symbol = Symbol('State value');
const stateRenderDeps: unique symbol = Symbol('State render dependencies');
const stateGeneration: unique symbol = Symbol('State generation counter');
const stateBindingDeps: unique symbol = Symbol('State binding dependencies');

// TODO: Have a validation function we call after every full render pass. find the root RenderedElement, and then verifies:
// * all reachable DOM nodes that are RenderedElements are in the root's tree
// * tree if sull of attached dom nodes that have DOM relationship same as tree relationship
// * depth is correct
// * all deps links are consistent
// * a component can't return the result of another component? TODO: is there a way this can work?

// TODO: state should be a class, so we can use instaceof to check types.

export class State<T> {
    [stateValue]: T;
    [stateRenderDeps]: Set<RenderedElement>;
    [stateBindingDeps]: Set<Binding<any>>;
    [stateGeneration]: number;

    constructor(value: T) {
        this[stateValue] = value;
        this[stateRenderDeps] = new Set();
        this[stateBindingDeps] = new Set();
        this[stateGeneration] = 0;
    }
};



type Prefix<N extends number, T extends any[], AccT extends any[] = []> = AccT['length'] extends N ? AccT : Prefix<N, T, [...AccT, T[AccT['length']]]>;
//type Prefix<N extends number, T extends any[], AccT extends any[] = []> = AccT['length'] extends N ? AccT : Prefix<N, T, [...AccT, T[AccT['length']]]>;

type Suffix<N extends number, T extends any[], AccT extends null[] = []> = AccT['length'] extends N ? T : (T extends [any, ...infer Rest] ? Suffix<N, Rest, [...AccT, null]> : never);

type RenderState<N extends number, ArgsT extends any[]> = Prefix<N, WrapInState<ArgsT>>;    // TODO: why does WrapInState<N, Prefix<ArgsT>> not work?
//type RenderState<N extends number, ArgsT extends any[]> = WrapInState<Prefix<N, ArgsT>>;    // TODO: why does WrapInState<N, Prefix<ArgsT>> not work?

type RenderConst<N extends number, ArgsT extends any[]> = Suffix<N, ArgsT>;

type WrapInState<T extends any[]> = {
    [K in keyof T]: State<T[K]>;
}

type StateArgsToGens<T extends any[]> = {
    [K in keyof T]: number;
}

type Binding<ArgsT extends []> = {
    e: HTMLElement | null;  // null if detached from the DOM.
    stateArgs: WrapInState<ArgsT>;
    callback: (e: HTMLElement, ...args: ArgsT) => void;
};

type OnDetachCallback = (e: Element) => void;

type DetachableElement = {
    onDetach?: OnDetachCallback;
};

type RenderedElementFields<StateArgsT extends any[], ConstArgsT extends any[]> = {
    depth: number; // -1 if not attached to the DOM
    stateArgs: WrapInState<StateArgsT>;
    stateGens: StateArgsToGens<StateArgsT>;
    constArgs: ConstArgsT;
    component: (...args: [...WrapInState<StateArgsT>, ...ConstArgsT]) => RenderedElement;
    callees: RenderedElement[];    // TODO: rename callees
    bindings: Set<Binding<any>>;
};

const renderedElementFields = Symbol('Rendered element fields');
export type RenderedElement = HTMLElement & { [renderedElementFields]: RenderedElementFields<any[], any[]> };

type MaybeRenderedElement = HTMLElement & { [renderedElementFields]?: RenderedElementFields<any[], any[]> };

////////////////
// Global State
// TODO: comments
////////////////

type RenderContext = {
    // TODO: some sort of name for debugging?
    bindingMap: Map<HTMLElement, Binding<any>[]>;
    callees: RenderedElement[];
    prevChildren: RenderedElement[];    // TODO: rename prevCallees
};
const renderStack: RenderContext[] = [];
let inBindCallback: boolean = false;

function renderContext(): RenderContext {
    if (inBindCallback) {
        throw new Error('no rendering allowed in bind callbacks');
    }
    if (renderStack.length === 0) {
        throw new Error('Operation not allowed outside of a render function.');
    }
    return renderStack[renderStack.length - 1];
}

type PendingWork = {
    timeoutID: number;
    state: Set<State<any>>;
    promise: Promise<void>;
    resolve: () => void;
    reject: (reason?: any) => void;
};
let pendingWork: PendingWork | null = null;

function detach(e: Element): void {
    const detachable: DetachableElement = e as any;
    if (detachable.onDetach !== undefined) {
        detachable.onDetach(e);
    }
    if (e instanceof HTMLElement) {
        const fields = (e as MaybeRenderedElement)[renderedElementFields];
        if (fields !== undefined) {
            // Detach deps from StateArgs.
            for (const state of fields.stateArgs) {
                state[stateRenderDeps].delete(e as RenderedElement);
            }

            // Detach bindings to descendent elements.
            for (const binding of fields.bindings) {
                for (const state of binding.stateArgs) {
                    state[stateBindingDeps].delete(binding);
                }
                // NB: so bindings on elements that are detached due to a re-render are not rebound.
                binding.e = null;
            }
            // NB: so elements that are detached don't get rerendered if their state changes at the same time as an ancestor's.
            fields.depth = -1;
        }
    }
    
    for (let i = 0; i < e.children.length; i++) {
        const child = e.children.item(i);
        if (child === null) {
            continue;
        }
        detach(child);
    }
}

function setDepth(e: Element, depth: number): void {
    const fields = (e as MaybeRenderedElement)[renderedElementFields];
    if (fields !== undefined) {
        fields.depth = depth;
        depth++; 
    }
    
    for (let i = 0; i < e.children.length; i++) {
        const child = e.children.item(i);
        if (child === null) {
            continue;
        }
        setDepth(child, depth);
    }
}

// For sorting elements by their depth, shallowest first.
function elementCompare(a: RenderedElement, b: RenderedElement): number {
    return a[renderedElementFields].depth - b[renderedElementFields].depth;
}

function parentRenderedElement(re: RenderedElement): RenderedElement {
    let ancestor: MaybeRenderedElement | null = re.parentElement;
    while (true) {
        if (ancestor === null) {
            throw new Error('RenderedElement has no parent');
        }
        if (ancestor[renderedElementFields] !== undefined) {
            return ancestor as RenderedElement;
        }
        ancestor = ancestor.parentElement;
    }
}

function arrayContains(array: any[], element: any): boolean {
    for (let i = 0; i < array.length; i++) {
        if (array[i] === element) {
            return true;
        }
    }
    return false;
}

function validateCallees(e: HTMLElement, callees: MaybeRenderedElement[]): void {
    // TODO: maybe this should merely raise warnings?
    for (const callee of callees) {
        // Verify that callee was attached.
        let ancestor: MaybeRenderedElement | null = callee.parentElement;
        while (true) {
            if (ancestor === e) {
                // Directly attached to the rendering component.
                break;
            }
            if (ancestor === null) {
                // Attached but not under any component.
                throw new Error('child was not attached');
            }
            const fields = ancestor[renderedElementFields];
            if (fields !== undefined) {
                // Attached under a different component, make sure it's in the containing components constArgs so the containing component can rerender properly.
                if (!arrayContains(fields.constArgs, callee)) {
                    throw new Error('components must be attached directly under the element returned by a render function, or passed via const args to be attached under child components');
                }
                // Also check that e is an ancestor.
                while (ancestor !== e) {
                    if (ancestor === null) {
                        throw new Error('components must be attached under the element returned by a render function');
                    }
                    ancestor = ancestor.parentElement
                }
                return;
            }
            ancestor = ancestor.parentElement;
        }
    }
}

function replaceCallee(re: RenderedElement, newCallee: RenderedElement, oldCallee: RenderedElement): void {
    const callees = re[renderedElementFields].callees;
    for (let i = 0; i < callees.length; i++) {
        if (callees[i] === oldCallee) {
            callees[i] = newCallee;
            return;
        }
    }
}

function rerenderElement(dirty: RenderedElement): void {
    if (renderStack.length !== 0) {
        throw new Error('uiRoot called during render');
    }
    if (dirty.parentElement === null) {
        throw new Error('dirty element is not attached to anything');
    }
    const fields = dirty[renderedElementFields];
    const depth = fields.depth;
    renderStack.push({
        bindingMap: new Map(),
        callees: [],
        prevChildren: [dirty],
    });
    const re = fields.component(...[...fields.stateArgs, ...fields.constArgs]);
    
    if (renderStack.length as number !== 1) {
        throw new Error('renderStack is unbalanced');
    }
    const checkCtx = renderStack.pop() as RenderContext;
    if (checkCtx.bindingMap.size !== 0) {
        throw new Error('bind called outside of a component');
    }
    if (checkCtx.callees.length !== 1 || checkCtx.callees[0] !== re) {
        throw new Error('unexpected callees of rerender');
    }
    if (checkCtx.prevChildren.length !== 0) {
        throw new Error('rerendered component should have detached dirty');
    }

    setDepth(re, depth);
    // Hook up re into the RenderedElement tree.
    if (depth > 0) {
        replaceCallee(parentRenderedElement(dirty), re, dirty);
    }
    dirty.parentElement.replaceChild(re, dirty);
}

function setStateWorker() {
    const pending = pendingWork;
    pendingWork = null;
    if (pending === null) {
        throw new Error('pendingWork is null');
    }

    if (renderStack.length !== 0) {
        throw new Error('renderStack is not empty');
    }

    const dirtyElements: RenderedElement[] = [];
    const dirtyBindings: Binding<any>[] = [];
    for (const s of pending.state) {
        dirtyElements.push(...s[stateRenderDeps]);
        dirtyBindings.push(...s[stateBindingDeps]);
    }
    
    dirtyElements.sort(elementCompare);
    
    const errors: any[] = [];

    for (const dirty of dirtyElements) {
        const fields = dirty[renderedElementFields];
        if (fields.depth === -1) {
            // e has been detached, so skip it.
            continue;
        }
        try {
            rerenderElement(dirty);
        } catch (e) {
            errors.push(e);
        }
    }
    inBindCallback = true;
    for (const dirty of dirtyBindings) {
        if (dirty.e === null) {
            // e has been detached, so skip it.
            continue;
        }
        try {
            dirty.callback(dirty.e, dirty.stateArgs.map(x => x[stateValue]));
        } catch (e) {
            errors.push(e);
        }
    }
    inBindCallback = false;
    if (errors.length === 0) {
        pending.resolve();
    } else {
        pending.reject(errors);
    }
}

// TODO: make member of class State
export function uiSetState<T>(s: State<T>, value: T): Promise<void> {
    if (renderStack.length !== 0) {
        throw new Error('setState is not allowed in render functions'); 
    }
    s[stateValue] = value;
    s[stateGeneration]++;
    if (pendingWork === null) {
        let resolve: any;   // TODO: how to get this to typecheck?
        let reject: any;
        const promise = new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const state = new Set<State<any>>();
        const timeoutID = setTimeout(setStateWorker, 0);
        pendingWork = { timeoutID, state, promise, resolve, reject };
    }
    pendingWork.state.add(s);
    return pendingWork.promise;
}

function arrayShallowEquals(a: any[], b: any[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

function findPrevChild<ArgsT extends any[]>(ctx: RenderContext, component: (...args: ArgsT) => HTMLElement,  stateArgs: State<any>[], constArgs: any[]): RenderedElement | null {
    for (let i = 0; i < ctx.prevChildren.length; i++) {
        const child = ctx.prevChildren[i];
        const fields = child[renderedElementFields];
        if (fields.component === component &&
            arrayShallowEquals(fields.stateArgs, stateArgs) &&
            arrayShallowEquals(fields.constArgs, constArgs)) {
            return ctx.prevChildren.splice(i, 1)[0];
        }
    }
    return null;
}

function validateBindings(e: HTMLElement, bindings: Set<Binding<any>>): void {
    for (const b of bindings.values()) {
        // Verify that binding was attached.
        let ancestor: MaybeRenderedElement | null = b.e;
        while (true) {
            if (ancestor === e) {
                break;
            }
            if (ancestor === null) {
                throw new Error('bound element is not attached to tree');
            }
            if (ancestor[renderedElementFields] !== undefined) {
                throw new Error('bound called on element not directly under rendered element');
            }
            ancestor = ancestor.parentElement;
        }
    }
}


export function uiComponent<N extends number, ArgsT extends any[]>(stateArgsCount: N, render: (...args: ArgsT) => HTMLElement): (...args: [...RenderState<N, ArgsT>, ...RenderConst<N, ArgsT>]) => RenderedElement {
    // Manages the render context
    // TODO: update the name on this function for better debugging?
    return function component(...args: [...RenderState<N, ArgsT>, ...RenderConst<N, ArgsT>]): RenderedElement {
        const parentCtx = renderContext();
        const stateArgs: State<any>[] = args.slice(0, stateArgsCount) as State<any>[];
        const stateVals: any[] = stateArgs.map(x => x[stateValue]);
        const stateGens: number[] = stateArgs.map(x => x[stateGeneration]);
        const constArgs: any[] = args.slice(stateArgsCount);
        
        // Check parentCtx.prevChildren for matching state and const args. Remove from prevChildren.
        const prev = findPrevChild(parentCtx, component, stateArgs, constArgs);

        // Previously rendered element has same state and const args, and state has the same generation. So we can re-use it.
        if (prev !== null && arrayShallowEquals(prev[renderedElementFields].stateGens, stateGens)) {
            parentCtx.callees.push(prev);
            return prev;
        }

        // Set up new ctx with previous children if we found a previous element.
        const ctx: RenderContext = {
            bindingMap: new Map(),
            callees: [],
            prevChildren: prev === null ? [] : prev[renderedElementFields].callees,
        };
        renderStack.push(ctx);

        // render
        const e: MaybeRenderedElement = render(...[...stateVals, ...constArgs] as any as ArgsT);

        // pop ctx
        const checkCtx = renderStack.pop();
        if (checkCtx !== ctx) {
            throw new Error('wrong RenderContext on renderStack');
        }

        // Detach anything left inside prev that wasn't used by render above.
        if (prev !== null) {
            detach(prev);
        }
        
        // check callees are under reterned element
        const callees = ctx.callees;
        validateCallees(e, callees);

        // Check bindings are under the returned element
        const bindings = new Set<Binding<any>>();
        for (const bs of ctx.bindingMap.values()) {
            for (const b of bs) {
                bindings.add(b);
            }
        }
        validateBindings(e, bindings);

        if (e[renderedElementFields] !== undefined) {
            // TODO: maybe we can do something with .cloneNode, but it will be complicated.
            throw new Error('component functions must not return an existing component');
        }

        // build RenderedFields, attach to element
        const fields: RenderedElementFields<any, any> = {
            depth: -1,
            stateArgs,
            stateGens,
            constArgs,
            component: component as any,
            callees,
            bindings,
        };
        e[renderedElementFields] = fields;
        const re: RenderedElement = e as RenderedElement;

        // update binding and state deps
        for (const b of bindings) {
            for (const s of b.stateArgs) {
                s[stateBindingDeps].add(b);
            }
        }
        for (const s of stateArgs) {
            s[stateRenderDeps].add(re);
        }

        // add rendered element to parentCtx.callees
        parentCtx.callees.push(re);

        return re;
    };
}

export function uiRoot<ArgsT extends any[]>(component: (...args: ArgsT) => RenderedElement, ...args: ArgsT): RenderedElement {
    if (renderStack.length !== 0) {
        throw new Error('uiRoot called during render');
    }

    renderStack.push({
        bindingMap: new Map(),
        callees: [],
        prevChildren: [],
    });
    const re = component(...args);
    if (renderStack.length as number !== 1) {
        throw new Error('renderStack is unbalanced');
    }
    const ctx = renderStack.pop() as RenderContext;
    if (ctx.bindingMap.size !== 0) {
        throw new Error('bind called outside of a component');
    }
    if (ctx.callees.length !== 1 || ctx.callees[0] !== re) {
        throw new Error('unexpected callees of uiRoot');
    }

    setDepth(re, 0);
    return re;
}

export function uiBind<ArgsT extends any[]>(e: HTMLElement, callback: (e: HTMLElement, ...args: ArgsT) => void, ...state: WrapInState<ArgsT>): void {
    inBindCallback = true;
    try {
        callback(e, ...state.map(x => x[stateValue]) as ArgsT);
    } finally {
        inBindCallback = false;
    }
    // Add binding to containing RenderContext, so that it can be associated with the containing RenderElement.
    const ctx = renderContext();
    let bindings = ctx.bindingMap.get(e);
    if (bindings === undefined) {
        bindings = [];
        ctx.bindingMap.set(e, bindings);
    }
    bindings.push({e, stateArgs: state, callback});
}
