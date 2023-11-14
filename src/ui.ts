
// TODO: Have a validation function we call after every full render pass. find the root RenderedElement, and then verifies:
// * all reachable DOM nodes that are RenderedElements are in the root's tree
// * tree if sull of attached dom nodes that have DOM relationship same as tree relationship
// * depth is correct
// * all deps links are consistent
// * a component can't return the result of another component? TODO: is there a way this can work?

class HasStateDep {
    // TODO: depth?
    private stateDeps: Map<State<any>, number>; // State -> generation.

    constructor() {
        this.stateDeps = new Map();
    }

    addDep(s: State<any>, gen: number): void {
        this.stateDeps.set(s, gen);
    }

    detach() {
        for (const [dep, _gen] of this.stateDeps.entries()) {
            dep[uiStateDetach](this);
        }
        this.stateDeps.clear();
    }
}

class Binding extends HasStateDep {
    private e: MaybeBoundElement;
    private callback: (e: HTMLElement) => void;

    constructor(e: HTMLElement, callback: (e: HTMLElement) => void) {
        super();
        this.e = e;
        this.callback = callback;

        // TODO: make sure e is not attached to the DOM (and does not have a RenderedElement as an ancestor)?
    }

    bindThis() {
        contextStack.push(this);
        try {
            this.callback(this.e);
        } finally {
            if (this !== contextStack.pop()) {
                throw new Error('unbalanced context stack push/pop');
            }
        }

        this.e[uiBinding] = this;
    }
};

function hasAncestor(e: HTMLElement, ancestor: Rendering<any>): boolean {
    for (let i: MaybeRenderedElement<any> | null = e.parentElement; i !== null; i = i.parentElement) {
        if (i[uiRendering] === ancestor) {
            return true;
        }
    }
    return false;
}

function detach(e: MaybeBoundRenderedElement<any>) {
    if (e[uiBinding] !== undefined) {
        e[uiBinding].detach();
    }
    if (e[uiRendering] !== undefined) {
        e[uiRendering].detach();
    }
}

function detachDescendants(e: HTMLElement) {
    const children = e.children;
    for (let i = 0; i < children.length; i++) {
        const child = children.item(i);
        if (child instanceof HTMLElement) {
            detachDescendants(child);
            detach(child);
        }
    }
}

class Rendering<ArgsT extends any[]> extends HasStateDep {
    private e: RenderedElement<ArgsT> | null;
    private render: (...args: ArgsT) => HTMLElement;
    private args: ArgsT;
    private currCallees: Set<Rendering<any>>;
    private prevCallees?: Set<Rendering<any>>;

    constructor(render: (...args: ArgsT) => HTMLElement, args: ArgsT) {
        super();
        this.e = null;
        this.render = render;
        this.args = args;
        this.currCallees = new Set();
        this.prevCallees = undefined;
    }

    getElement(): RenderedElement<ArgsT> | null {
        return this.e;
    }

    private renderThisContextHelper(): HTMLElement {
        contextStack.push(this);
        try {
            return this.render(...this.args);
        } finally {
            if (this !== contextStack.pop()) {
                throw new Error('unbalanced context stack push/pop');
            }
        }
    }

    renderThis(): RenderedElement<ArgsT> {
        const oldE = this.e;
        const newE: MaybeRenderedElement<ArgsT> = this.renderThisContextHelper();

        // Attach the new element.
        newE[uiRendering] = this;
        this.e = newE as RenderedElement<ArgsT>;
        
        // Check that callees are children in the DOM.
        for (const callee of this.currCallees) {
            if (callee.e === null) {
                throw new Error('current callee is detached from DOM');
            }
            if (!hasAncestor(callee.e, this)) {
                throw new Error('callee was not attached as a descendant to caller');
            }
        }

        // If we are re-rendering.
        if (oldE !== null) {
            // We don't want stale elements linked to Renderings that are still used.
            (oldE as MaybeRenderedElement<ArgsT>)[uiRendering] = undefined;

            // Detach the old subtree from State.
            // NB: Any elements that were re-used should now be attached to the newly rendered e.
            detachDescendants(oldE);
            
            // Replace the old subtree with the new one.
            if (oldE.parentElement === null) {
                throw new Error('re-rendering an element that is not attached to the DOM');
            }
            oldE.parentElement.replaceChild(newE, oldE);

            // TODO: check that prevCallees are all detached from the DOM?
        }

        this.prevCallees = this.currCallees;
        this.currCallees = new Set();

        return this.e;
    }
    
    getPrevCallee<CalleeArgsT extends any[]>(render: (...args: CalleeArgsT) => HTMLElement, args: CalleeArgsT): Rendering<CalleeArgsT> | undefined {
        if (this.prevCallees === undefined) {
            return undefined;
        }
        calleeSearch:
        for (const callee of this.prevCallees) {
            //const rendering = callee[uiRendering];
            if (callee.render !== render) {
                continue;
            }
            if (callee.args.length !== args.length) {
                continue;
            }
            for (let i = 0; i < args.length; i++) {
                if (callee.args[i] !== args[i]) {
                    continue calleeSearch;
                }
            }
            this.prevCallees.delete(callee);
            return callee;
        }
        return undefined;
    }

    renderCallee<CalleeArgsT extends any[]>(render: (...args: CalleeArgsT) => HTMLElement, args: CalleeArgsT): RenderedElement<CalleeArgsT> {
        // Check if callee is in prevCallees and re-use it if state generations match, or re-use it's callees if they don't.
        const prevCallee = this.getPrevCallee(render, args);
        if (prevCallee !== undefined) {
            // Previously rendered callee has same render and args.
            // NB: If prevCallee has stale state, it will be visited later in the current setStateWorker call.
            this.currCallees.add(prevCallee);
            if (prevCallee.e === null) {
                throw new Error('prevCallee is not attached');
            }
            return prevCallee.e;
        }

        const rendering = new Rendering(render, args);
        const e = rendering.renderThis();
        
        this.currCallees.add(rendering);
        return e;
    }
};

const uiRendering = Symbol('this element was returned by a render function');
const uiBinding = Symbol('this element has bound data');

// TODO: comment on how this subtree shouldn't be touched.
export type OpaqueRenderedElement = {[uiRendering]: Rendering<any> };

type RenderedElement<ArgsT extends any[]> = HTMLElement & { [uiRendering]: Rendering<ArgsT> };
type BoundElement = HTMLElement & { [uiBinding]: Binding };
type MaybeRenderedElement<ArgsT extends any[]> = HTMLElement & { [uiRendering]?: Rendering<ArgsT> };
type MaybeBoundElement = HTMLElement & { [uiBinding]?: Binding };
type MaybeBoundRenderedElement<ArgsT extends any[]> = HTMLElement & { [uiBinding]?: Binding; [uiRendering]?: Rendering<ArgsT> };

export function uiComponent<ArgsT extends any[]>(render: (...args: ArgsT) => HTMLElement): (...args: ArgsT) => OpaqueRenderedElement {
    return function uiRenderWrapper(...args: ArgsT): RenderedElement<ArgsT> {
        // Check the state of the context stack.
        if (contextStack.length === 0) {
            // This is a root render function.
            const rendering = new Rendering(render, args);
            return rendering.renderThis();
        }

        const ctx = contextStack[contextStack.length-1];
        if (!(ctx instanceof Rendering)) {
            throw new Error("uiComponent function called outside of render context");
        }

        return ctx.renderCallee(render, args);
    };
}

export function uiRoot<ArgsT extends any[]>(container: HTMLElement, component: (...args: ArgsT) => OpaqueRenderedElement, ...args: ArgsT): void {
    const e: RenderedElement<ArgsT> = component(...args) as RenderedElement<ArgsT>;
    container.appendChild(e); 
}

export function uiBind(e: HTMLElement, callback: (e: HTMLElement) => void) {
    // Check the state of the context stack.
    if (contextStack.length === 0) {
        throw new Error("uiBind function called outside of any context");
    }
    const ctx = contextStack[contextStack.length-1];
    if (!(ctx instanceof Rendering)) {
        throw new Error("uiBind function called outside of render context");
    }

    const b = new Binding(e, callback);
    b.bindThis();
}

const contextStack: (Binding | Rendering<any>)[] = [];

type PendingWork = {
    timeoutID: number;
    states: Set<State<any>>;
    promise: Promise<void>;
    resolve: (value: void | PromiseLike<void>) => void;
    reject: (reason?: any) => void;
};
let pendingWork: PendingWork | null = null;

const uiStateDetach = Symbol('module local method on State to detach dependencies');
const uiStateDepsValues = Symbol('module local method on State to get dependencies');

export class State<T> {
    private value: T;
    private gen: number;
    private deps: Set<HasStateDep>;

    constructor(value: T) {
        this.value = value;
        this.gen = 0;
        this.deps = new Set();
    }

    [uiStateDetach](dep: HasStateDep) {
        this.deps.delete(dep);
    }

    [uiStateDepsValues](): IterableIterator<HasStateDep> {
        return this.deps.values();
    }

    get(): T {
        if (contextStack.length > 0) {
            this.deps.add(contextStack[contextStack.length - 1]);
            contextStack[contextStack.length-1].addDep(this, this.gen);
        }
        return this.value;
    }

    set(value: T): PromiseLike<void> {
        if (contextStack.length !== 0) {
            throw new Error('set State not allowed in any render or bind function');
        }
        this.value = value;
        this.gen++;
        
        if (pendingWork === null) {
            let resolve: any;
            let reject: any;
            const promise = new Promise<void>((res, rej) => {
                resolve = res;
                reject = rej;
            });
            const states = new Set<State<any>>();
            const timeoutID = setTimeout(setStateWorker, 0);
            pendingWork = { timeoutID, states, promise, resolve, reject };
        }
        pendingWork.states.add(this);
        return pendingWork.promise;
    }
};

function getElementDepth(e: HTMLElement | null, depthMap: Map<HTMLElement, number>): number {
    if (e === null) {
        return 0;
    }
    let d = depthMap.get(e);
    if (d === undefined) {
        d = getElementDepth(e.parentElement, depthMap);
        depthMap.set(e, d);
    }
    return d;
}

function setStateWorker() {
    const pending = pendingWork;
    pendingWork = null;
    if (pending === null) {
        throw new Error('pendingWork is null');
    }

    if (contextStack.length !== 0) {
        throw new Error('contextStack is not empty');
    }

    const bindWork = new Set<Binding>();
    const renderWork = new Set<Rendering<any>>();
    const depthMap = new Map<HTMLElement, number>();
    for (const state of pending.states) {
        for (const dep of state[uiStateDepsValues]()) {
            if (dep instanceof Binding) {
                bindWork.add(dep);
            } else if (dep instanceof Rendering) {
                renderWork.add(dep);
                const e = dep.getElement();
                if (e === undefined) {
                    throw new Error('detached rendering in pending work');
                }
                getElementDepth(e, depthMap);
            } else {
                throw new Error('unknown State dep type');
            }
        }
    }

    // First, do re-renders.

    // Order by depth, shallowest to deepest. So we don't re-render something
    // that will get removed by an ancestor's re-render.
    const renderWorkArray = [...renderWork].sort((a, b) => {
        return getElementDepth(a.getElement(), depthMap) - getElementDepth(b.getElement(), depthMap);
    });

    for (const rendering of renderWorkArray) {
        if (rendering.getElement() === null) {
            // Element is detached, from a re-render of an ancestor.
            continue;
        }
        rendering.renderThis();
    }

    // Finally, do bindings. They are all local to an element, so order doesn't
    // matter.
    for (const binding of bindWork) {
        binding.bindThis();
    }

    // TODO: catch exceptions.
    pending.resolve();
}

// Below here is not refactored ===============================================
// ============================================================================
// ============================================================================
// ============================================================================
/*
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

type ComponentDebugInfo = {
    name: string;
};

type RenderedElementFields<StateArgsT extends any[], ConstArgsT extends any[]> = {
    debugInfo: ComponentDebugInfo;
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

function debugComponentName(e: MaybeRenderedElement): string | undefined{
    const fields = e[renderedElementFields];
    if (fields === undefined) {
        return undefined;
    }
    return fields.debugInfo.name;
    // // TODO: maybe printing args is too much.
    // let name = fields.name + '(';
    // for (const arg of fields.stateArgs) {
    //     name += arg + ',';
    // }
    // if (name.endsWith(',')) {
    //     name = name.substring(0, name.length - 1);
    // }
    // name += ')(';
    // for (const arg of fields.constArgs) {
    //     if (arg instanceof HTMLElement) {
    //         name += debugComponentName(arg) + ',';
    //     } else {
    //         name += arg + ',';
    //     }
    // }
    // if (name.endsWith(',')) {
    //     name = name.substring(0, name.length - 1);
    // }
    // name += ')';
    // return name;
}

function debugHTMLName(e: HTMLElement): string {
    let name = '<' + e.tagName;
    if (e.id !== '') {
        name += '#' + e.id;
    }
    if (e.classList.length > 0) {
        for (let i = 0; i < e.classList.length; i++) {
            name += '.' + e.classList[i];
        }
    }
    return name + '>';
}

export function debugElementName(e: MaybeRenderedElement): string {
    const htmlName = debugHTMLName(e);
    let componentName = debugComponentName(e);
    if (componentName === undefined) {
        return htmlName;
    }
    return componentName + htmlName;
}

export function debugDOMPath(e: MaybeRenderedElement): string {
    const parentPath = e.parentElement !== null ? debugDOMPath(e.parentElement) : '';
    return `${parentPath}/${debugElementName(e)}`;
}

export function debugLogUITree(e: MaybeRenderedElement) {
    console.groupCollapsed(debugElementName(e));
    try {
        const fields = e[renderedElementFields];
        if (fields !== undefined) {
            for (let i = 0; i < fields.stateArgs.length; i++) {
                const arg = fields.stateArgs[i];
                console.group(`constArg[${i}]`);
                console.dir(arg[stateValue]);
                console.groupEnd();
            }
            for (let i = 0; i < fields.constArgs.length; i++) {
                const arg = fields.constArgs[i];
                console.group(`stateArg[${i}]`);
                console.dir(arg[stateValue]);
                console.groupEnd();
            }
        }
        for (let i = 0; i < e.children.length; i++) {
            const child = e.children.item(i);
            if (child instanceof HTMLElement) {
                debugLogUITree(child);
            }
        }
    } finally {
        console.groupEnd();
    }
}

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
let renderCount: number = 0;    // For logging.

const indent = '                                                                                ';
function timeName(render: Function) {
    const name = render.name !== "" ? render.name : '(anonymous)';
    return `${renderCount}${indent.substring(0, renderStack.length)}${name}`;
}

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
    
    const tn = `${renderCount} RERENDER`;
    renderCount++;
    console.log(debugDOMPath(dirty));
    console.time(tn);
    try {
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
        debugLogUITree(re);
    } finally {
        console.timeEnd(tn);
    }
}

let setStateCount = 0;

function setStateWorker() {
    const pending = pendingWork;
    pendingWork = null;
    if (pending === null) {
        throw new Error('pendingWork is null');
    }

    if (renderStack.length !== 0) {
        throw new Error('renderStack is not empty');
    }

    const tn = `${setStateCount} EVALUATE STATE`;
    setStateCount++;
    console.time(tn);

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
    console.timeEnd(tn);
}

// TODO: make member of class State
export function uiSetState<T>(s: State<T>, value: T): Promise<void> {
    if (renderStack.length !== 0) {
        throw new Error('setState is not allowed in render functions'); 
    }
    console.timeStamp(`SETSTATE ${setStateCount}`);
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
    const debugInfo: ComponentDebugInfo = {
        name: render.name !== '' ? render.name : 'anonymous',
    };
    // TODO: extract the argument names from render.
    // console.log(render.toString());
    // console.dir(functionArgs.exec(render.toString()));
    
    return function component(...args: [...RenderState<N, ArgsT>, ...RenderConst<N, ArgsT>]): RenderedElement {
        const parentCtx = renderContext();
        const tn = timeName(render);
        console.time(tn);
        try {
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
                debugInfo,
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
        } finally {
            console.timeEnd(tn);
        }
    };
}

export function uiRoot<ArgsT extends any[]>(component: (...args: ArgsT) => RenderedElement, ...args: ArgsT): RenderedElement {
    if (renderStack.length !== 0) {
        throw new Error('uiRoot called during render');
    }

    const tn = `${renderCount} ROOT`;
    renderCount++;
    console.time(tn);
    try {
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
    } finally {
        console.timeEnd(tn);
    }
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
*/