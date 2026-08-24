import type { ElkNode } from 'elkjs/lib/elk-api.js';
import {
  defineLayoutEngine,
  LayoutError,
  type LayoutInput,
  type LayoutInputNode,
  type LayoutMode,
} from '@nodebraid/layout-api';

import type { ElkLayoutConfig } from './contracts';
import { resolveElkLayoutConfig } from './elk-config';
import { getElk } from './elk-runtime';

export const elkLayoutEngine = defineLayoutEngine<ElkLayoutConfig>({
  id: 'elk',
  capabilities: { incremental: true, fixedNodes: true, selfLoops: true },
  async compute(input, config, context) {
    context.signal.throwIfAborted();
    const effectiveConfig = resolveElkLayoutConfig(config);
    const elk = await getElk();
    context.signal.throwIfAborted();
    if (input.mode === 'incremental' && effectiveConfig.algorithm !== 'stress') {
      throw new LayoutError(
        'UNSUPPORTED_FEATURE',
        'ELK incremental layout requires the stress algorithm.',
        Object.freeze({ feature: 'incremental', providerId: 'elk', algorithm: effectiveConfig.algorithm }),
      );
    }
    if (input.nodes.some((node) => node.fixed) && effectiveConfig.algorithm !== 'stress') {
      throw new LayoutError(
        'UNSUPPORTED_FEATURE',
        'ELK Fixed Nodes require the stress algorithm.',
        Object.freeze({ feature: 'fixedNodes', providerId: 'elk', algorithm: effectiveConfig.algorithm }),
      );
    }
    const graph: ElkNode = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': effectiveConfig.algorithm,
        'elk.direction': effectiveConfig.direction,
        'org.eclipse.elk.interactive': String(input.mode === 'incremental' || input.nodes.some((node) => node.fixed)),
        'elk.spacing.nodeNode': String(effectiveConfig.nodeSpacing),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(effectiveConfig.layerSpacing),
        'elk.padding': `[top=${effectiveConfig.padding},left=${effectiveConfig.padding},bottom=${effectiveConfig.padding},right=${effectiveConfig.padding}]`,
        'elk.randomSeed': String(effectiveConfig.randomSeed),
      },
      children: input.nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.size.width,
        height: node.size.height,
        ...(node.fixed ? { layoutOptions: { 'org.eclipse.elk.stress.fixed': 'true' } } : {}),
      })),
      edges: input.edges.map((edge) => ({
        id: edge.id,
        sources: [edge.sourceNodeId],
        targets: [edge.targetNodeId],
      })),
    };
    const result = await elk.layout(graph);
    context.signal.throwIfAborted();
    const rawPositions = new Map((result.children ?? []).map((node) => [node.id, { x: node.x, y: node.y }]));
    const translations = getWorldTranslations(input, rawPositions);
    return {
      sourceRevision: input.revision,
      positions: input.nodes.map((node) => ({
        id: node.id,
        position: node.fixed
          ? node.position
          : translate(rawPositions.get(node.id) as { x: number; y: number }, translations.get(node.id)!),
      })),
    };
  },
});

function getWorldTranslations(
  input: LayoutInput,
  positions: ReadonlyMap<string, { readonly x?: number; readonly y?: number }>,
): ReadonlyMap<string, { readonly x: number; readonly y: number }> {
  const nodes = new Map(input.nodes.map((node) => [node.id, node]));
  const adjacency = new Map(input.nodes.map((node) => [node.id, new Set<LayoutInputNode['id']>()]));
  for (const edge of input.edges) {
    adjacency.get(edge.sourceNodeId)?.add(edge.targetNodeId);
    adjacency.get(edge.targetNodeId)?.add(edge.sourceNodeId);
  }
  const translations = new Map<LayoutInputNode['id'], { readonly x: number; readonly y: number }>();
  const visited = new Set<LayoutInputNode['id']>();
  for (const startNode of input.nodes) {
    if (visited.has(startNode.id)) continue;
    const component = [];
    const pending = [startNode.id];
    visited.add(startNode.id);
    while (pending.length > 0) {
      const nodeId = pending.pop()!;
      const node = nodes.get(nodeId);
      if (node) component.push(node);
      for (const adjacentId of adjacency.get(nodeId) ?? []) {
        if (visited.has(adjacentId)) continue;
        visited.add(adjacentId);
        pending.push(adjacentId);
      }
    }
    const fixedNodes = component.filter((node) => node.fixed);
    const translation =
      fixedNodes.length > 0
        ? fixedComponentTranslation(fixedNodes, positions)
        : incrementalComponentTranslation(component, positions, input.mode);
    for (const node of component) translations.set(node.id, translation);
  }
  return translations;
}

function fixedComponentTranslation(
  fixedNodes: readonly LayoutInputNode[],
  positions: ReadonlyMap<string, { readonly x?: number; readonly y?: number }>,
): { readonly x: number; readonly y: number } {
  const firstPosition = positions.get(fixedNodes[0]!.id);
  const translation = Object.freeze({
    x: fixedNodes[0]!.position.x - (firstPosition?.x ?? Number.NaN),
    y: fixedNodes[0]!.position.y - (firstPosition?.y ?? Number.NaN),
  });
  for (const node of fixedNodes) {
    const position = positions.get(node.id);
    if (
      !position ||
      !nearlyEqual((position.x ?? Number.NaN) + translation.x, node.position.x) ||
      !nearlyEqual((position.y ?? Number.NaN) + translation.y, node.position.y)
    ) {
      throw new LayoutError(
        'INVALID_PROPOSAL',
        'ELK did not preserve the relative positions of Fixed Nodes.',
        Object.freeze({ issue: 'INCONSISTENT_FIXED_TRANSLATION', nodeId: node.id }),
      );
    }
  }
  return translation;
}

function incrementalComponentTranslation(
  component: readonly LayoutInputNode[],
  positions: ReadonlyMap<string, { readonly x?: number; readonly y?: number }>,
  mode: LayoutMode,
): { readonly x: number; readonly y: number } {
  if (mode !== 'incremental' || component.length === 0) return Object.freeze({ x: 0, y: 0 });
  const total = component.reduce(
    (sum, node) => {
      const position = positions.get(node.id);
      return {
        x: sum.x + node.position.x - (position?.x ?? Number.NaN),
        y: sum.y + node.position.y - (position?.y ?? Number.NaN),
      };
    },
    { x: 0, y: 0 },
  );
  return Object.freeze({ x: total.x / component.length, y: total.y / component.length });
}

function translate(
  position: { readonly x: number; readonly y: number },
  translation: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  return { x: position.x + translation.x, y: position.y + translation.y };
}

function nearlyEqual(left: number, right: number): boolean {
  return Number.isFinite(left) && Math.abs(left - right) <= 1e-7;
}
