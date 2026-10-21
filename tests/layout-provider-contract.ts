import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { createLayoutInput, type LayoutCapabilities, type LayoutEngine } from '@nodebraid/layout-api';

export function registerFullLayoutProviderContract<Config>(options: {
  readonly name: string;
  readonly engine: LayoutEngine<Config>;
  readonly config: Config;
  readonly capabilities: LayoutCapabilities;
}): void {
  test(`${options.name} full layout supports the baseline graph shapes`, async () => {
    const alphaId = nodeId('alpha');
    const betaId = nodeId('beta');
    const detachedId = nodeId('detached');
    const kernel = createCanvasKernel();
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: alphaId,
        type: 'task',
        position: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
        data: null,
      });
      for (const id of [betaId, detachedId]) {
        transaction.nodes.add({
          id,
          type: 'task',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 40 },
          data: null,
        });
      }
      transaction.edges.add({
        id: edgeId('alpha-beta-1'),
        type: 'flow',
        source: { nodeId: alphaId },
        target: { nodeId: betaId },
        data: null,
      });
      transaction.edges.add({
        id: edgeId('alpha-beta-2'),
        type: 'flow',
        source: { nodeId: alphaId },
        target: { nodeId: betaId },
        data: null,
      });
      transaction.edges.add({
        id: edgeId('beta-alpha'),
        type: 'flow',
        source: { nodeId: betaId },
        target: { nodeId: alphaId },
        data: null,
      });
      transaction.edges.add({
        id: edgeId('beta-self'),
        type: 'flow',
        source: { nodeId: betaId },
        target: { nodeId: betaId },
        data: null,
      });
    });
    const input = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });
    const emptyInput = createLayoutInput(createCanvasKernel().read(), { mode: 'full', fixedNodeIds: [] });
    const context = { signal: new AbortController().signal };

    const [first, second, empty] = await Promise.all([
      options.engine.compute(input, options.config, context),
      options.engine.compute(input, options.config, context),
      options.engine.compute(emptyInput, options.config, context),
    ]);

    expect({
      capabilities: options.engine.capabilities,
      ids: first.positions.map((position) => position.id),
      finite: first.positions.every(({ position }) => Number.isFinite(position.x) && Number.isFinite(position.y)),
      deterministic: JSON.stringify(first) === JSON.stringify(second),
      empty,
    }).toEqual({
      capabilities: options.capabilities,
      ids: [alphaId, betaId, detachedId],
      finite: true,
      deterministic: true,
      empty: { sourceRevision: 0, positions: [] },
    });

    kernel.transact((transaction) => {
      for (const [id, sourcePort, targetPort] of [
        ['alpha-beta-1', 'out-a', undefined],
        ['alpha-beta-2', undefined, 'in-a'],
        ['beta-alpha', 'out-b', 'in-b'],
      ] as const) {
        const edge = transaction.query.getEdge(edgeId(id));
        if (!edge) throw new Error('Expected baseline Edge.');
        transaction.edges.replace(edge.id, {
          ...edge,
          source: sourcePort === undefined ? edge.source : { ...edge.source, portId: sourcePort },
          target: targetPort === undefined ? edge.target : { ...edge.target, portId: targetPort },
        });
      }
    });
    const portInput = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });
    const withPorts = await options.engine.compute(portInput, options.config, context);
    expect(portInput.edges).toEqual(input.edges);
    expect(withPorts.positions).toEqual(first.positions);
  });
}
