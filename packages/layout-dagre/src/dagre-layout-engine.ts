import { graphlib, layout } from '@dagrejs/dagre';
import { defineLayoutEngine } from '@cflow/layout-api';

import type { DagreLayoutConfig } from './contracts';
import { resolveDagreLayoutConfig } from './dagre-config';

export const dagreLayoutEngine = defineLayoutEngine<DagreLayoutConfig>({
  id: 'dagre',
  capabilities: { incremental: false, fixedNodes: false, selfLoops: true },
  compute(input, config, context) {
    context.signal.throwIfAborted();
    const effectiveConfig = resolveDagreLayoutConfig(config);
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
      graph.setNode(node.id, { width: node.size.width, height: node.size.height });
    }
    for (const edge of input.edges) {
      graph.setEdge(edge.sourceNodeId, edge.targetNodeId, {}, edge.id);
    }
    layout(graph);
    context.signal.throwIfAborted();
    return {
      sourceRevision: input.revision,
      positions: input.nodes.map((node) => {
        const result = graph.node(node.id) as { x: number; y: number };
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
