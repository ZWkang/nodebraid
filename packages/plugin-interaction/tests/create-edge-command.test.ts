import { expect, test } from 'bun:test';

import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createEdgeCommand, interactionPlugin } from '../src';

test('Create Edge commits one complete Node-level Edge', async () => {
  let commands: CommandService | undefined;
  let kernel: KernelService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
    },
  });
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => new CommandRenderer())),
    host.install(interactionPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel) throw new Error('Expected Create Edge Runtime Services.');
  const sourceNodeId = nodeId('source');
  const targetNodeId = nodeId('target');
  const connectionId = edgeId('source-target');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceNodeId, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: targetNodeId, type: 'task', position: { x: 100, y: 0 }, data: null });
  });

  const commit = await commands.execute(createEdgeCommand, {
    edge: {
      id: connectionId,
      type: 'flow',
      source: { nodeId: sourceNodeId },
      target: { nodeId: targetNodeId },
      data: Object.freeze({ label: 'approved' }),
    },
    source: { nodeId: sourceNodeId, role: 'source' },
    target: { nodeId: targetNodeId, role: 'target' },
  });

  expect(commit).toMatchObject({
    changeSet: { origin: 'interaction', commandId: 'interaction.edge.create' },
  });
  expect(kernel.read().query.getEdge(connectionId)).toEqual({
    id: connectionId,
    type: 'flow',
    source: { nodeId: sourceNodeId },
    target: { nodeId: targetNodeId },
    data: { label: 'approved' },
  });
  await expect(
    commands.execute(createEdgeCommand, {
      edge: {
        id: edgeId('parallel-edge'),
        type: 'flow',
        source: { nodeId: sourceNodeId },
        target: { nodeId: targetNodeId },
        data: null,
      },
      source: { nodeId: sourceNodeId, role: 'source' },
      target: { nodeId: targetNodeId, role: 'target' },
    }),
  ).resolves.toMatchObject({ changeSet: { commandId: 'interaction.edge.create' } });
  const beforeRejected = kernel.read();
  await expect(
    commands.execute(createEdgeCommand, {
      edge: {
        id: edgeId('self-loop'),
        type: 'flow',
        source: { nodeId: sourceNodeId },
        target: { nodeId: sourceNodeId },
        data: null,
      },
      source: { nodeId: sourceNodeId, role: 'source' },
      target: { nodeId: sourceNodeId, role: 'target' },
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_CONNECTION' });
  await expect(
    commands.execute(createEdgeCommand, {
      edge: {
        id: edgeId('port-edge'),
        type: 'flow',
        source: { nodeId: sourceNodeId, portId: 'output' },
        target: { nodeId: targetNodeId },
        data: null,
      },
      source: { nodeId: sourceNodeId, role: 'source' },
      target: { nodeId: targetNodeId, role: 'target' },
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_CONNECTION' });
  await expect(
    commands.execute(createEdgeCommand, {
      edge: {
        id: connectionId,
        type: 'flow',
        source: { nodeId: sourceNodeId },
        target: { nodeId: targetNodeId },
        data: null,
      },
      source: { nodeId: sourceNodeId, role: 'source' },
      target: { nodeId: targetNodeId, role: 'target' },
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'STALE_GESTURE' });
  await expect(
    commands.execute(createEdgeCommand, {
      edge: {
        id: edgeId('missing-target-edge'),
        type: 'flow',
        source: { nodeId: sourceNodeId },
        target: { nodeId: nodeId('missing-target') },
        data: null,
      },
      source: { nodeId: sourceNodeId, role: 'source' },
      target: { nodeId: nodeId('missing-target'), role: 'target' },
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'STALE_GESTURE' });
  expect(kernel.read()).toBe(beforeRejected);
  await host.dispose();
});

class CommandRenderer implements CanvasRenderer {
  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(): void {}
  subscribeInput(_listener: RendererInputListener): () => void {
    return () => undefined;
  }
  hitTest(_point: ScreenPoint): HitResult {
    return { type: 'canvas', worldPoint: { x: 0, y: 0 } };
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}
  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
