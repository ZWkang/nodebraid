import { graphlib, layout } from '@dagrejs/dagre';
import { defineLayoutEngine } from '@nodebraid/layout-api';

import type { DagreLayoutConfig } from './contracts';
import { resolveDagreLayoutConfig } from './dagre-config';

export const dagreLayoutEngine = defineLayoutEngine<DagreLayoutConfig>({
  id: 'dagre',
  capabilities: { incremental: false, fixedNodes: false, selfLoops: true },
  compute(input, config, context) {
    context.signal.throwIfAborted();
    const effectiveConfig = resolveDagreLayoutConfig(config);
    // Graphlib joins endpoint IDs and edge names with control-character delimiters.
    const nodeKeys = new Map(input.nodes.map((node, index) => [node.id, `node-${index}`]));
    const graph = new graphlib.Graph({ directed: true, multigraph: true })
      .setGraph({
        rankdir: effectiveConfig.direction,
        nodesep: effectiveConfig.nodeSpacing,
        edgesep: effectiveConfig.edgeSpacing,
        ranksep: effectiveConfig.rankSpacing,
        marginx: effectiveConfig.marginX,
        marginy: effectiveConfig.marginY,
      })
      .setDefaultEdgeLabel(() => ({}));
    for (const node of input.nodes) {
      graph.setNode(nodeKeys.get(node.id)!, { width: node.size.width, height: node.size.height });
    }
    for (const [index, edge] of input.edges.entries()) {
      graph.setEdge(nodeKeys.get(edge.sourceNodeId)!, nodeKeys.get(edge.targetNodeId)!, {}, `edge-${index}`);
    }
    layout(graph);
    context.signal.throwIfAborted();
    return {
      sourceRevision: input.revision,
      positions: input.nodes.map((node) => {
        const result = graph.node(nodeKeys.get(node.id)!) as { x: number; y: number };
        return {
          id: node.id,
          position: {
            x: result.x - node.size.width / 2,
            y: result.y - node.size.height / 2,
          },
        };
      }),
    };
  },
});
