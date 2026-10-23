import type { CanvasEdge, CanvasNode } from '@nodebraid/kernel';

export interface CanvasDocumentDataCodec {
  readonly format: string;
  encode(data: unknown): string;
  decode(text: string): unknown;
}

export interface DecodedCanvasDocument {
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
}
