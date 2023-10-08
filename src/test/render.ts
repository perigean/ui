import { RenderedElement, State, uiComponent, uiRoot, uiSetState } from "../ui.js";
import { assertEq, domText, renderCounter } from "./util.js";

export async function testBasicRender() {
    const rootCount = {i: 0};
    const rootState = new State('root1');
    const container = document.createElement('div');
    const root = uiRoot(renderCounter(rootCount), rootState);
    container.appendChild(root);

    assertEq(rootCount.i, 1);
    assertEq(domText(container.children.item(0)), `
<div id="root1">
</div>`);
    await uiSetState(rootState, 'root2');
    assertEq(rootCount.i, 2);
    assertEq(domText(container.children.item(0)), `
<div id="root2">
</div>`);
} 

export async function testSiblingRender() {
    const container = document.createElement('div');
    const rootState = new State('root1');
    const aState = new State('a1');
    const bState = new State('b1');
    const aCount = {i: 0};
    const aComponent = renderCounter(aCount);
    const bCount = {i: 0};
    const bComponent = renderCounter(bCount);
    const root = uiRoot(uiComponent(1, (rootID: string) => {
        const e = document.createElement('div');
        e.id = rootID;
        e.appendChild(aComponent(aState));
        e.appendChild(bComponent(bState));
        return e;
    }), rootState);
    container.appendChild(root);

    assertEq(aCount.i, 1);
    assertEq(bCount.i, 1);
    assertEq(domText(container.children.item(0)), `
<div id="root1">
  <div id="a1">
  </div>
  <div id="b1">
  </div>
</div>`);

    await uiSetState(rootState, 'root2');
    // BUG: depth is not updated properly here.
    assertEq(aCount.i, 1);  // a, b elements should be untouched.
    assertEq(bCount.i, 1);
    assertEq(domText(container.children.item(0)), `
<div id="root2">
  <div id="a1">
  </div>
  <div id="b1">
  </div>
</div>`);

    await uiSetState(aState, 'a2');
    assertEq(aCount.i, 2);
    assertEq(bCount.i, 1);  // b element should be untouched.
    assertEq(domText(container.children.item(0)), `
<div id="root2">
  <div id="a2">
  </div>
  <div id="b1">
  </div>
</div>`);

    uiSetState(rootState, 'root3');
    await uiSetState(bState, 'b2');
    assertEq(aCount.i, 2);  // a element should be re-used.
    assertEq(bCount.i, 2);
    assertEq(domText(container.children.item(0)), `
<div id="root3">
  <div id="a2">
  </div>
  <div id="b2">
  </div>
</div>`);
}

export async function testChildrenArgs() {
  const c = uiComponent(0, function childrenCounter(counter: {i: number}, ...children: HTMLElement[]): HTMLElement {
    counter.i++;
    const e = document.createElement('div');
    for (const child of children) {
      e.appendChild(child);
    }
    return e;
  });
  const container = document.createElement('div');
  const rootState = new State('root1');
  const aState = new State('a1');
  const bState = new State('b1');
  const aCount = {i: 0};
  const aComponent = renderCounter(aCount);
  const bCount = {i: 0};
  const bComponent = renderCounter(bCount);
  const c1Count = {i: 0};
  const c2Count = {i: 0};
  container.appendChild(uiRoot(uiComponent(1, function root(id: string): HTMLElement {
    const e = document.createElement('div');
    e.id = id;
    const a = aComponent(aState);
    const b = bComponent(bState);
    e.appendChild(c(c1Count, c(c2Count, a), b));
    return e;
  }), rootState));
  assertEq(aCount.i, 1);
  assertEq(bCount.i, 1);
  assertEq(domText(container.children.item(0)), `
<div id="root1">
  <div>
    <div>
      <div id="a1">
      </div>
    </div>
    <div id="b1">
    </div>
  </div>
</div>`);

  await uiSetState(rootState, 'root2');
  assertEq(aCount.i, 1);
  assertEq(bCount.i, 1);
  assertEq(c1Count.i, 1);
  assertEq(c2Count.i, 1);
  assertEq(domText(container.children.item(0)), `
<div id="root2">
  <div>
    <div>
      <div id="a1">
      </div>
    </div>
    <div id="b1">
    </div>
  </div>
</div>`);

  await uiSetState(aState, 'a2');
  assertEq(aCount.i, 2);
  assertEq(bCount.i, 1);
  assertEq(c1Count.i, 1);
  assertEq(c2Count.i, 1);
  assertEq(domText(container.children.item(0)), `
<div id="root2">
  <div>
    <div>
      <div id="a2">
      </div>
    </div>
    <div id="b1">
    </div>
  </div>
</div>`);
  
  await uiSetState(bState, 'b2');
  assertEq(aCount.i, 2);
  assertEq(bCount.i, 2);
  assertEq(c1Count.i, 1);
  assertEq(c2Count.i, 1);
  assertEq(domText(container.children.item(0)), `
<div id="root2">
  <div>
    <div>
      <div id="a2">
      </div>
    </div>
    <div id="b2">
    </div>
  </div>
</div>`);
}
