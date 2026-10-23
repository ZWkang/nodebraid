import { NodeBraidError } from '@nodebraid/diagnostics';

export type CanvasDocumentErrorCode =
  'INVALID_DOCUMENT' | 'UNSUPPORTED_VERSION' | 'DATA_FORMAT_MISMATCH' | 'INVALID_CODEC';

export class CanvasDocumentError extends NodeBraidError<'document', CanvasDocumentErrorCode> {
  override readonly name = 'CanvasDocumentError';

  constructor(code: CanvasDocumentErrorCode, message: string) {
    super('document', code, message);
  }
}
