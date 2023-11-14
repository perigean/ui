import { div } from "../dom.js";
import { State, uiRoot, uiComponent, OpaqueRenderedElement } from "../ui.js";
import { assertEq, domText, renderCounter } from "./util.js";

export async function testBasicRender() {
    const rootCount = {i: 0};
    const rootState = new State('root1');
    const container = document.createElement('div');
    uiRoot(container, renderCounter(rootCount), rootState);

    assertEq(rootCount.i, 1);
    assertEq(domText(container.children.item(0)), `
<div id="root1">
</div>`);
    await rootState.set('root2');
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
    uiRoot(container, uiComponent((rootID: State<string>) => {
      return div(
        {id: rootID.get()},
        aComponent(aState),
        bComponent(bState),
      );
    }), rootState);

    assertEq(aCount.i, 1);
    assertEq(bCount.i, 1);
    assertEq(domText(container.children.item(0)), `
<div id="root1">
  <div id="a1">
  </div>
  <div id="b1">
  </div>
</div>`);

    await rootState.set('root2');
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

    await aState.set('a2');
    assertEq(aCount.i, 2);
    assertEq(bCount.i, 1);  // b element should be untouched.
    assertEq(domText(container.children.item(0)), `
<div id="root2">
  <div id="a2">
  </div>
  <div id="b1">
  </div>
</div>`);

    rootState.set('root3');
    await bState.set('b2');
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
  const c = uiComponent(function childrenCounter(counter: {i: number}, ...children: (OpaqueRenderedElement | HTMLElement)[]): HTMLElement {
    counter.i++;
    return div({}, ...children);
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
  uiRoot(container, uiComponent(function root(id: State<string>): HTMLElement {
    const a = aComponent(aState);
    const b = bComponent(bState);
    return div(
      {id: id.get()},
      c(c1Count, c(c2Count, a), b),
    );
  }), rootState);
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

  await rootState.set('root2');
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

  await aState.set('a2');
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
  
  await bState.set('b2');
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
