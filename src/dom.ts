// TODO: DOM api should just deal with HTMLElements and not have anything to do with components, just bindings.

import { State, uiBind } from "./ui.js";
type Equals<X, Y> =
    (<T> () => T extends X ? 1 : 2) extends
        (<T> () => T extends Y ? 1 : 2)
            ? true
            : false

type Writeable<O extends Record<any, any>, P extends keyof O> = Equals<{[_ in P]: O[P]}, {-readonly [_ in P]: O[P]}>;

type WriteableStyleKey = {
    [K in keyof CSSStyleDeclaration]: Writeable<CSSStyleDeclaration, K> extends true ? (K extends string ? (CSSStyleDeclaration[K] extends string ? K : never) : never) : never;
}[keyof CSSStyleDeclaration];

type StyleAttributes = {
    [K in WriteableStyleKey]?: string | State<string>;
}

const styleKeyNames: Set<string> = new Set([
    'accentColor',
    'alignContent',
    'alignItems',
    'alignSelf',
    'alignmentBaseline',
    'all',
    'animation',
    'animationComposition',
    'animationDelay',
    'animationDirection',
    'animationDuration',
    'animationFillMode',
    'animationIterationCount',
    'animationName',
    'animationPlayState',
    'animationTimingFunction',
    'appearance',
    'aspectRatio',
    'backdropFilter',
    'backfaceVisibility',
    'background',
    'backgroundAttachment',
    'backgroundBlendMode',
    'backgroundClip',
    'backgroundColor',
    'backgroundImage',
    'backgroundOrigin',
    'backgroundPosition',
    'backgroundPositionX',
    'backgroundPositionY',
    'backgroundRepeat',
    'backgroundSize',
    'baselineShift',
    'blockSize',
    'border',
    'borderBlock',
    'borderBlockColor',
    'borderBlockEnd',
    'borderBlockEndColor',
    'borderBlockEndStyle',
    'borderBlockEndWidth',
    'borderBlockStart',
    'borderBlockStartColor',
    'borderBlockStartStyle',
    'borderBlockStartWidth',
    'borderBlockStyle',
    'borderBlockWidth',
    'borderBottom',
    'borderBottomColor',
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
    'borderBottomStyle',
    'borderBottomWidth',
    'borderCollapse',
    'borderColor',
    'borderEndEndRadius',
    'borderEndStartRadius',
    'borderImage',
    'borderImageOutset',
    'borderImageRepeat',
    'borderImageSlice',
    'borderImageSource',
    'borderImageWidth',
    'borderInline',
    'borderInlineColor',
    'borderInlineEnd',
    'borderInlineEndColor',
    'borderInlineEndStyle',
    'borderInlineEndWidth',
    'borderInlineStart',
    'borderInlineStartColor',
    'borderInlineStartStyle',
    'borderInlineStartWidth',
    'borderInlineStyle',
    'borderInlineWidth',
    'borderLeft',
    'borderLeftColor',
    'borderLeftStyle',
    'borderLeftWidth',
    'borderRadius',
    'borderRight',
    'borderRightColor',
    'borderRightStyle',
    'borderRightWidth',
    'borderSpacing',
    'borderStartEndRadius',
    'borderStartStartRadius',
    'borderStyle',
    'borderTop',
    'borderTopColor',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderTopStyle',
    'borderTopWidth',
    'borderWidth',
    'bottom',
    'boxShadow',
    'boxSizing',
    'breakAfter',
    'breakBefore',
    'breakInside',
    'captionSide',
    'caretColor',
    'clear',
    'clipPath',
    'clipRule',
    'color',
    'colorInterpolation',
    'colorInterpolationFilters',
    'colorScheme',
    'columnCount',
    'columnFill',
    'columnGap',
    'columnRule',
    'columnRuleColor',
    'columnRuleStyle',
    'columnRuleWidth',
    'columnSpan',
    'columnWidth',
    'columns',
    'contain',
    'containIntrinsicBlockSize',
    'containIntrinsicHeight',
    'containIntrinsicInlineSize',
    'containIntrinsicSize',
    'containIntrinsicWidth',
    'container',
    'containerName',
    'containerType',
    'content',
    'counterIncrement',
    'counterReset',
    'counterSet',
    'cssFloat',
    'cssText',
    'cursor',
    'direction',
    'display',
    'dominantBaseline',
    'emptyCells',
    'fill',
    'fillOpacity',
    'fillRule',
    'filter',
    'flex',
    'flexBasis',
    'flexDirection',
    'flexFlow',
    'flexGrow',
    'flexShrink',
    'flexWrap',
    'float',
    'floodColor',
    'floodOpacity',
    'font',
    'fontFamily',
    'fontFeatureSettings',
    'fontKerning',
    'fontOpticalSizing',
    'fontPalette',
    'fontSize',
    'fontSizeAdjust',
    'fontStretch',
    'fontStyle',
    'fontSynthesis',
    'fontSynthesisSmallCaps',
    'fontSynthesisStyle',
    'fontSynthesisWeight',
    'fontVariant',
    'fontVariantAlternates',
    'fontVariantCaps',
    'fontVariantEastAsian',
    'fontVariantLigatures',
    'fontVariantNumeric',
    'fontVariantPosition',
    'fontVariationSettings',
    'fontWeight',
    'gap',
    'grid',
    'gridArea',
    'gridAutoColumns',
    'gridAutoFlow',
    'gridAutoRows',
    'gridColumn',
    'gridColumnEnd',
    'gridColumnStart',
    'gridRow',
    'gridRowEnd',
    'gridRowStart',
    'gridTemplate',
    'gridTemplateAreas',
    'gridTemplateColumns',
    'gridTemplateRows',
    'height',
    'hyphenateCharacter',
    'hyphens',
    'imageRendering',
    'inlineSize',
    'inset',
    'insetBlock',
    'insetBlockEnd',
    'insetBlockStart',
    'insetInline',
    'insetInlineEnd',
    'insetInlineStart',
    'isolation',
    'justifyContent',
    'justifyItems',
    'justifySelf',
    'left',
    'letterSpacing',
    'lightingColor',
    'lineBreak',
    'lineHeight',
    'listStyle',
    'listStyleImage',
    'listStylePosition',
    'listStyleType',
    'margin',
    'marginBlock',
    'marginBlockEnd',
    'marginBlockStart',
    'marginBottom',
    'marginInline',
    'marginInlineEnd',
    'marginInlineStart',
    'marginLeft',
    'marginRight',
    'marginTop',
    'marker',
    'markerEnd',
    'markerMid',
    'markerStart',
    'mask',
    'maskClip',
    'maskComposite',
    'maskImage',
    'maskMode',
    'maskOrigin',
    'maskPosition',
    'maskRepeat',
    'maskSize',
    'maskType',
    'mathStyle',
    'maxBlockSize',
    'maxHeight',
    'maxInlineSize',
    'maxWidth',
    'minBlockSize',
    'minHeight',
    'minInlineSize',
    'minWidth',
    'mixBlendMode',
    'objectFit',
    'objectPosition',
    'offset',
    'offsetDistance',
    'offsetPath',
    'offsetRotate',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outlineColor',
    'outlineOffset',
    'outlineStyle',
    'outlineWidth',
    'overflow',
    'overflowAnchor',
    'overflowClipMargin',
    'overflowWrap',
    'overflowX',
    'overflowY',
    'overscrollBehavior',
    'overscrollBehaviorBlock',
    'overscrollBehaviorInline',
    'overscrollBehaviorX',
    'overscrollBehaviorY',
    'padding',
    'paddingBlock',
    'paddingBlockEnd',
    'paddingBlockStart',
    'paddingBottom',
    'paddingInline',
    'paddingInlineEnd',
    'paddingInlineStart',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'page',
    'pageBreakAfter',
    'pageBreakBefore',
    'pageBreakInside',
    'paintOrder',
    'perspective',
    'perspectiveOrigin',
    'placeContent',
    'placeItems',
    'placeSelf',
    'pointerEvents',
    'position',
    'printColorAdjust',
    'quotes',
    'resize',
    'right',
    'rotate',
    'rowGap',
    'rubyPosition',
    'scale',
    'scrollBehavior',
    'scrollMargin',
    'scrollMarginBlock',
    'scrollMarginBlockEnd',
    'scrollMarginBlockStart',
    'scrollMarginBottom',
    'scrollMarginInline',
    'scrollMarginInlineEnd',
    'scrollMarginInlineStart',
    'scrollMarginLeft',
    'scrollMarginRight',
    'scrollMarginTop',
    'scrollPadding',
    'scrollPaddingBlock',
    'scrollPaddingBlockEnd',
    'scrollPaddingBlockStart',
    'scrollPaddingBottom',
    'scrollPaddingInline',
    'scrollPaddingInlineEnd',
    'scrollPaddingInlineStart',
    'scrollPaddingLeft',
    'scrollPaddingRight',
    'scrollPaddingTop',
    'scrollSnapAlign',
    'scrollSnapStop',
    'scrollSnapType',
    'scrollbarGutter',
    'shapeImageThreshold',
    'shapeMargin',
    'shapeOutside',
    'shapeRendering',
    'stopColor',
    'stopOpacity',
    'stroke',
    'strokeDasharray',
    'strokeDashoffset',
    'strokeLinecap',
    'strokeLinejoin',
    'strokeMiterlimit',
    'strokeOpacity',
    'strokeWidth',
    'tabSize',
    'tableLayout',
    'textAlign',
    'textAlignLast',
    'textAnchor',
    'textCombineUpright',
    'textDecoration',
    'textDecorationColor',
    'textDecorationLine',
    'textDecorationSkipInk',
    'textDecorationStyle',
    'textDecorationThickness',
    'textEmphasis',
    'textEmphasisColor',
    'textEmphasisPosition',
    'textEmphasisStyle',
    'textIndent',
    'textOrientation',
    'textOverflow',
    'textRendering',
    'textShadow',
    'textTransform',
    'textUnderlineOffset',
    'textUnderlinePosition',
    'top',
    'touchAction',
    'transform',
    'transformBox',
    'transformOrigin',
    'transformStyle',
    'transition',
    'transitionDelay',
    'transitionDuration',
    'transitionProperty',
    'transitionTimingFunction',
    'translate',
    'unicodeBidi',
    'userSelect',
    'verticalAlign',
    'visibility',
    'webkitLineClamp',
    'webkitMaskComposite',
    'webkitTextFillColor',
    'webkitTextStroke',
    'webkitTextStrokeColor',
    'webkitTextStrokeWidth',
    'whiteSpace',
    'widows',
    'width',
    'willChange',
    'wordBreak',
    'wordSpacing',
    'writingMode',
    'zIndex',
]);

function isStyleKey(name: string): name is WriteableStyleKey {
    return styleKeyNames.has(name);
}

function applyStyles(e: HTMLElement, style: StyleAttributes) {
    let bindState: State<string>[] | undefined;
    let bindName: WriteableStyleKey[] | undefined;
    for (const name in style) {
        if (isStyleKey(name)) {
            const value = style[name];
            if (value instanceof State) {
                (bindState = bindState || []).push(value);
                (bindName = bindName || []).push(name);
            } else if (value !== undefined) {
                e.style[name] = value;
            }
        }
    }
    if (bindState !== undefined && bindName !== undefined) {
        const bindNameNotUndefined = bindName;
        uiBind(e, (e, ...bindValues) => {
            for (let i = 0; i < bindValues.length; i++) {
                e.style[bindNameNotUndefined[i]] = bindValues[i];
            }
        }, ...bindState)
    }
}

type ElementAttributes = {
    id?: string | State<string>;
    innerText?: string | State<string>;
    // Event attributes
    onabort?: ((this: GlobalEventHandlers, ev: UIEvent) => any) | State<(this: GlobalEventHandlers, ev: UIEvent) => any>;
    onanimationcancel?: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | State<(this: GlobalEventHandlers, ev: AnimationEvent) => any>;
    onanimationend?: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | State<(this: GlobalEventHandlers, ev: AnimationEvent) => any>;
    onanimationiteration?: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | State<(this: GlobalEventHandlers, ev: AnimationEvent) => any>;
    onanimationstart?: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | State<(this: GlobalEventHandlers, ev: AnimationEvent) => any>;
    onauxclick?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onbeforeinput?: ((this: GlobalEventHandlers, ev: InputEvent) => any) | State<(this: GlobalEventHandlers, ev: InputEvent) => any>;
    onblur?: ((this: GlobalEventHandlers, ev: FocusEvent) => any) | State<(this: GlobalEventHandlers, ev: FocusEvent) => any>;
    oncancel?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    oncanplay?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    oncanplaythrough?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onchange?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onclick?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onclose?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    oncontextmenu?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    oncopy?: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | State<(this: GlobalEventHandlers, ev: ClipboardEvent) => any>;
    oncuechange?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    oncut?: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | State<(this: GlobalEventHandlers, ev: ClipboardEvent) => any>;
    ondblclick?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    ondrag?: ((this: GlobalEventHandlers, ev: DragEvent) => any) | State<(this: GlobalEventHandlers, ev: DragEvent) => any>;
    ondragend?: ((this: GlobalEventHandlers, ev: DragEvent) => any) | State<(this: GlobalEventHandlers, ev: DragEvent) => any>;
    ondragenter?: ((this: GlobalEventHandlers, ev: DragEvent) => any) | State<(this: GlobalEventHandlers, ev: DragEvent) => any>;
    ondragleave?: ((this: GlobalEventHandlers, ev: DragEvent) => any) | State<(this: GlobalEventHandlers, ev: DragEvent) => any>;
    ondragover?: ((this: GlobalEventHandlers, ev: DragEvent) => any) | State<(this: GlobalEventHandlers, ev: DragEvent) => any>;
    ondragstart?: ((this: GlobalEventHandlers, ev: DragEvent) => any) | State<(this: GlobalEventHandlers, ev: DragEvent) => any>;
    ondrop?: ((this: GlobalEventHandlers, ev: DragEvent) => any) | State<(this: GlobalEventHandlers, ev: DragEvent) => any>;
    ondurationchange?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onemptied?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onended?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onerror?: OnErrorEventHandlerNonNull | State<OnErrorEventHandlerNonNull>;
    onfocus?: ((this: GlobalEventHandlers, ev: FocusEvent) => any) | State<(this: GlobalEventHandlers, ev: FocusEvent) => any>;
    onformdata?: ((this: GlobalEventHandlers, ev: FormDataEvent) => any) | State<(this: GlobalEventHandlers, ev: FormDataEvent) => any>;
    ongotpointercapture?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    oninput?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    oninvalid?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onkeydown?: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | State<(this: GlobalEventHandlers, ev: KeyboardEvent) => any>;
    onkeypress?: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | State<(this: GlobalEventHandlers, ev: KeyboardEvent) => any>;
    onkeyup?: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | State<(this: GlobalEventHandlers, ev: KeyboardEvent) => any>;
    onload?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onloadeddata?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onloadedmetadata?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onloadstart?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onlostpointercapture?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onmousedown?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onmouseenter?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onmouseleave?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onmousemove?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onmouseout?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onmouseover?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onmouseup?: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | State<(this: GlobalEventHandlers, ev: MouseEvent) => any>;
    onpaste?: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | State<(this: GlobalEventHandlers, ev: ClipboardEvent) => any>;
    onpause?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onplay?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onplaying?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onpointercancel?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onpointerdown?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onpointerenter?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onpointerleave?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onpointermove?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onpointerout?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onpointerover?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onpointerup?: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | State<(this: GlobalEventHandlers, ev: PointerEvent) => any>;
    onprogress?: ((this: GlobalEventHandlers, ev: ProgressEvent) => any) | State<(this: GlobalEventHandlers, ev: ProgressEvent) => any>;
    onratechange?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onreset?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onresize?: ((this: GlobalEventHandlers, ev: UIEvent) => any) | State<(this: GlobalEventHandlers, ev: UIEvent) => any>;
    onscroll?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onsecuritypolicyviolation?: ((this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent) => any) | State<(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent) => any>;
    onseeked?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onseeking?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onselect?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onselectionchange?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onselectstart?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onslotchange?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onstalled?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onsubmit?: ((this: GlobalEventHandlers, ev: SubmitEvent) => any) | State<(this: GlobalEventHandlers, ev: SubmitEvent) => any>;
    onsuspend?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    ontimeupdate?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    ontoggle?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    ontouchcancel?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | State<(this: GlobalEventHandlers, ev: TouchEvent) => any>;
    ontouchend?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | State<(this: GlobalEventHandlers, ev: TouchEvent) => any>;
    ontouchmove?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | State<(this: GlobalEventHandlers, ev: TouchEvent) => any>;
    ontouchstart?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | State<(this: GlobalEventHandlers, ev: TouchEvent) => any>;
    ontransitioncancel?: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | State<(this: GlobalEventHandlers, ev: TransitionEvent) => any>;
    ontransitionend?: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | State<(this: GlobalEventHandlers, ev: TransitionEvent) => any>;
    ontransitionrun?: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | State<(this: GlobalEventHandlers, ev: TransitionEvent) => any>;
    ontransitionstart?: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | State<(this: GlobalEventHandlers, ev: TransitionEvent) => any>;
    onvolumechange?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onwaiting?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onwebkitanimationend?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onwebkitanimationiteration?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onwebkitanimationstart?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
    onwebkittransitionend?: ((this: GlobalEventHandlers, ev: Event) => any) | State<(this: GlobalEventHandlers, ev: Event) => any>;
};

export type Attributes = {
    style?: StyleAttributes;
} & ElementAttributes;

type AttributeKey = keyof ElementAttributes;  // TODO: add more

const attributeKeyNames: Set<string> = new Set([
    'id',
    'innerText',
    // event handlers
    'onabort',
    'onanimationcancel',
    'onanimationend',
    'onanimationiteration',
    'onanimationstart',
    'onauxclick',
    'onbeforeinput',
    'onblur',
    'oncancel',
    'oncanplay',
    'oncanplaythrough',
    'onchange',
    'onclick',
    'onclose',
    'oncontextmenu',
    'oncopy',
    'oncuechange',
    'oncut',
    'ondblclick',
    'ondrag',
    'ondragend',
    'ondragenter',
    'ondragleave',
    'ondragover',
    'ondragstart',
    'ondrop',
    'ondurationchange',
    'onemptied',
    'onended',
    'onerror',
    'onfocus',
    'onformdata',
    'ongotpointercapture',
    'oninput',
    'oninvalid',
    'onkeydown',
    'onkeypress',
    'onkeyup',
    'onload',
    'onloadeddata',
    'onloadedmetadata',
    'onloadstart',
    'onlostpointercapture',
    'onmousedown',
    'onmouseenter',
    'onmouseleave',
    'onmousemove',
    'onmouseout',
    'onmouseover',
    'onmouseup',
    'onpaste',
    'onpause',
    'onplay',
    'onplaying',
    'onpointercancel',
    'onpointerdown',
    'onpointerenter',
    'onpointerleave',
    'onpointermove',
    'onpointerout',
    'onpointerover',
    'onpointerup',
    'onprogress',
    'onratechange',
    'onreset',
    'onresize',
    'onscroll',
    'onsecuritypolicyviolation',
    'onseeked',
    'onseeking',
    'onselect',
    'onselectionchange',
    'onselectstart',
    'onslotchange',
    'onstalled',
    'onsubmit',
    'onsuspend',
    'ontimeupdate',
    'ontoggle',
    'ontouchcancel',
    'ontouchend',
    'ontouchmove',
    'ontouchstart',
    'ontransitioncancel',
    'ontransitionend',
    'ontransitionrun',
    'ontransitionstart',
    'onvolumechange',
    'onwaiting',
]);

function isAttributeKey(name: string): name is AttributeKey {
    return attributeKeyNames.has(name);
}

function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, attributes: Attributes, children: HTMLElement[]): HTMLElementTagNameMap[K] {
    const e = document.createElement(tagName);

    if (attributes.style !== undefined) {
        applyStyles(e, attributes.style);
    }

    let bindState: State<ElementAttributes[AttributeKey]>[] | undefined;
    let bindName: AttributeKey[] | undefined;
    for (const name in attributes) {
        if (isAttributeKey(name)) {
            const value = attributes[name];
            if (value instanceof State) {
                (bindState = bindState || []).push(value);
                (bindName = bindName || []).push(name);
            } else if (value !== undefined) {
                (e as any)[name] = value; // TODO: is there a way to typecheck this?
            }
        }
    }
    if (bindState !== undefined && bindName !== undefined) {
        const bindNameNotUndefined = bindName;
        uiBind(e, (e, ...bindValues) => {
            for (let i = 0; i < bindValues.length; i++) {
                (e as any)[bindNameNotUndefined[i]] = bindValues[i];  // TODO: how to typecheck this?
            }
        }, ...bindState)
    }

    for (const child of children) {
        e.appendChild(child);
    }

    return e;
}

export function div(attributes: Attributes, ...children: HTMLElement[]): HTMLDivElement {
    return createElement('div', attributes, children);
}

export function span(attributes: Attributes, ...children: HTMLElement[]): HTMLSpanElement {
    return createElement('span', attributes, children);
}
 