import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type NodeEditingErrorCode = 'INVALID_INPUT' | 'STALE_NODE';

export class NodeEditingError extends NodeBraidError<'plugin.node-editing', NodeEditingErrorCode> {
  override readonly name = 'NodeEditingError';

  constructor(code: NodeEditingErrorCode, message: string, details: DiagnosticAttributes = {}) {
    super('plugin.node-editing', code, message, { details });
  }
}
