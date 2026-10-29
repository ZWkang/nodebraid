import type { NodeId, Size } from '@nodebraid/kernel';

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
  readonly createNodeContent?: SvgNodeContentFactory;
}
export interface SvgNodeContentContext {
  readonly nodeId: NodeId;
  readonly type: string;
  readonly size: Size;
  readonly data: unknown;
  readonly document: Document;
}

/** Constructs a fresh, detached SVG subtree in Node-local coordinates. */
export type SvgNodeContentFactory = (context: Readonly<SvgNodeContentContext>) => SVGElement;
