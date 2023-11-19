
// TODO: have Rendering and Bindind remember State that is created, and then re-use on later rendering.
// Probably best to have a name (or number or symbol) for state.

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
            // NB: If prevCallee has stale state, it will be visited later in the current setStateWorker call, so it's OK to use it unchanged.
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

    map<MappedT>(f: (v: T) => MappedT): MappedState<T, MappedT> {
        return new MappedState(this, f);
    }
};

export class MappedState<StateT, T> {
    private f: (v: StateT) => T;
    private s: State<StateT>;

    constructor(s: State<StateT>, f: (v: StateT) => T) {
        this.f = f;
        this.s = s;
    }

    get(): T {
        return this.f(this.s.get());
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
