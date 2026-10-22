import type { CanvasView } from '@nodebraid/kernel';

import type { LayoutInput, LayoutInputOptions } from './contracts';
import { LayoutError } from './layout-error';

export function createLayoutInput(view: CanvasView, options: LayoutInputOptions): LayoutInput {
  const mode = options.mode;
  if (typeof mode !== 'string') {
    throw new LayoutError(
      'INVALID_REQUEST',
      'Layout mode must be full or incremental.',
      Object.freeze({
        issue: 'INVALID_MODE',
        receivedType: mode === null ? 'null' : typeof mode,
      }),
    );
  }
  if (mode !== 'full' && mode !== 'incremental') {
    throw new LayoutError(
      'INVALID_REQUEST',
      'Layout mode must be full or incremental.',
      Object.freeze({ issue: 'INVALID_MODE', mode }),
    );
  }
  const fixedNodeIds = new Set<LayoutInputOptions['fixedNodeIds'][number]>();
  for (const nodeId of options.fixedNodeIds) {
    if (fixedNodeIds.has(nodeId)) {
      throw new LayoutError(
        'INVALID_REQUEST',
        `Fixed Node "${nodeId}" is listed more than once.`,
        Object.freeze({ issue: 'DUPLICATE_FIXED_NODE', nodeId }),
      );
    }
    if (!view.query.getNode(nodeId)) {
      throw new LayoutError(
        'INVALID_REQUEST',
        `Fixed Node "${nodeId}" does not exist in the Canvas View.`,
        Object.freeze({ issue: 'UNKNOWN_FIXED_NODE', nodeId }),
      );
    }
    fixedNodeIds.add(nodeId);
  }
  const nodes = view.snapshot.nodes.map((node) => {
    if (node.size === undefined) {
      throw new LayoutError(
        'INVALID_INPUT',
        `Node "${node.id}" must have a Size before Layout.`,
        Object.freeze({ issue: 'MISSING_SIZE', nodeId: node.id }),
      );
    }
    if (node.parentId !== undefined) {
      throw new LayoutError(
        'INVALID_INPUT',
        `Nested Node "${node.id}" is not supported by the first Layout version.`,
        Object.freeze({ issue: 'UNSUPPORTED_NESTING', nodeId: node.id, parentId: node.parentId }),
      );
    }
    return Object.freeze({
      id: node.id,
      position: Object.freeze({ ...node.position }),
      size: Object.freeze({ ...node.size }),
      fixed: fixedNodeIds.has(node.id),
    });
  });
  const edges = view.snapshot.edges.map((edge) =>
    Object.freeze({
      id: edge.id,
      sourceNodeId: edge.source.nodeId,
      targetNodeId: edge.target.nodeId,
    }),
  );
  return Object.freeze({
    revision: view.snapshot.revision,
    mode,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}
