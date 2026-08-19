import { KernelError } from './kernel-error';

declare const nodeIdBrand: unique symbol;
declare const edgeIdBrand: unique symbol;

/** Node and Edge IDs use separate type-level namespaces while remaining strings at runtime. */
export type NodeId = string & { readonly [nodeIdBrand]: true };
export type EdgeId = string & { readonly [edgeIdBrand]: true };

export function nodeId(value: string): NodeId {
  if (typeof value !== 'string') {
    throw new KernelError(
      'INVALID_ID',
      'Node ID must be a non-empty string.',
      Object.freeze({ entity: 'node', receivedType: value === null ? 'null' : typeof value }),
    );
  }
  if (value.length === 0) {
    throw new KernelError(
      'INVALID_ID',
      'Node ID must be a non-empty string.',
      Object.freeze({ entity: 'node', value }),
    );
  }
  return value as NodeId;
}

export function edgeId(value: string): EdgeId {
  if (typeof value !== 'string') {
    throw new KernelError(
      'INVALID_ID',
      'Edge ID must be a non-empty string.',
      Object.freeze({ entity: 'edge', receivedType: value === null ? 'null' : typeof value }),
    );
  }
  if (value.length === 0) {
    throw new KernelError(
      'INVALID_ID',
      'Edge ID must be a non-empty string.',
      Object.freeze({ entity: 'edge', value }),
    );
  }
  return value as EdgeId;
}
