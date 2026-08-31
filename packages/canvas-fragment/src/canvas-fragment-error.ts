import { NodeBraidError } from '@nodebraid/diagnostics';

export type CanvasFragmentErrorCode = 'INVALID_FRAGMENT' | 'INVALID_MATERIALIZATION';

export class CanvasFragmentError extends NodeBraidError<'canvas-fragment', CanvasFragmentErrorCode> {
  override readonly name = 'CanvasFragmentError';

  constructor(code: CanvasFragmentErrorCode, message: string) {
    super('canvas-fragment', code, message);
  }
}
