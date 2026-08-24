export interface SvgDomEventPolicy {
  readonly preventDefault?: boolean;
  readonly stopPropagation?: boolean;
}

export interface SvgInputPolicies {
  readonly pointer?: SvgDomEventPolicy;
  readonly wheel?: SvgDomEventPolicy;
  readonly keyboard?: SvgDomEventPolicy;
  readonly contextMenu?: SvgDomEventPolicy;
}

export interface SvgRendererConfig {
  readonly target: SVGSVGElement;
  readonly edgeHitTolerance?: number;
  readonly connectionAnchorHitTolerance?: number;
  readonly input?: SvgInputPolicies;
}
