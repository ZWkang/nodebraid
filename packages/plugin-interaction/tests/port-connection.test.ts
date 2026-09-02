import { expect, test } from 'bun:test';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPortContributionPlugin, portPlugin } from '@nodebraid/plugin-port';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  PointerInput,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { InteractionProjection } from '@nodebraid/interaction-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { interactionPlugin } from '../src';

test('Port Gesture tracks target loss, materializes exact Endpoints once, and cancels on source loss', async () => {
  const renderer = new PortConnectionRenderer();
  const host = createPluginHost();
  let kernel: KernelService | undefined;
  const materialized: Array<Readonly<{ source: unknown; target: unknown }>> = [];
  const consumer = definePlugin({
    requires: { kernel: kernelService },
    setup(context) {
      kernel = context.services.kernel;
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin, {
      connection: {
        materializeEdge({ source, target }) {
          materialized.push({ source, target });
          return { id: edgeId(`port-edge-${materialized.length}`), type: 'flow', source, target, data: null };
        },
      },
    }),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel) throw new Error('Expected Kernel Service.');
  const sourceId = nodeId('port-source');
  const targetId = nodeId('port-target');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'source',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'target',
      position: { x: 200, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  const sourceContribution = host.install(
    createPortContributionPlugin({
      id: 'test-source-port',
      definePorts(node) {
        if (node.id === sourceId) return [{ id: 'output', role: 'source' }];
        return [];
      },
    }),
  );
  const createTargetContribution = (id: string) =>
    host.install(
      createPortContributionPlugin({
        id,
        definePorts(node) {
          if (node.id === targetId) return [{ id: 'input', role: 'target' }];
          return [];
        },
      }),
    );
  const targetContribution = createTargetContribution('test-target-port');
  await Promise.all([sourceContribution.whenActive(), targetContribution.whenActive()]);
  renderer.hit = {
    type: 'port',
    nodeId: sourceId,
    portId: 'output',
    role: 'source',
    worldPoint: { x: 80, y: 20 },
  };
  renderer.emit(pointerInput('pointer.down', { x: 80, y: 20 }));
  expect(renderer.projections.at(-1)).toMatchObject({
    type: 'connection-preview',
    source: { nodeId: sourceId, portId: 'output', role: 'source' },
  });

  renderer.hit = {
    type: 'port',
    nodeId: targetId,
    portId: 'input',
    role: 'target',
    worldPoint: { x: 200, y: 20 },
  };
  renderer.emit(pointerInput('pointer.move', { x: 200, y: 20 }));
  expect(renderer.projections.at(-1)).toMatchObject({
    type: 'connection-preview',
    target: { type: 'valid', anchor: { nodeId: targetId, portId: 'input', role: 'target' } },
  });

  await targetContribution.dispose();

  expect(renderer.projections.at(-1)).toMatchObject({ type: 'connection-preview', target: { type: 'none' } });
  expect(renderer.releasedPointers).toEqual([]);
  expect(materialized).toEqual([]);

  const replacementTarget = createTargetContribution('replacement-target-port');
  await replacementTarget.whenActive();
  renderer.emit(pointerInput('pointer.move', { x: 200, y: 20 }));
  renderer.emit(pointerInput('pointer.up', { x: 200, y: 20 }));
  await settleCommands();

  expect(materialized).toEqual([
    {
      source: { nodeId: sourceId, portId: 'output' },
      target: { nodeId: targetId, portId: 'input' },
    },
  ]);
  expect(kernel.read().snapshot.edges).toHaveLength(1);
  expect(kernel.read().snapshot.edges[0]).toMatchObject({
    source: { nodeId: sourceId, portId: 'output' },
    target: { nodeId: targetId, portId: 'input' },
  });

  renderer.hit = {
    type: 'port',
    nodeId: sourceId,
    portId: 'output',
    role: 'source',
    worldPoint: { x: 80, y: 20 },
  };
  renderer.emit(pointerInput('pointer.down', { x: 80, y: 20 }));
  await sourceContribution.dispose();

  expect(renderer.projections.at(-1)).toBeNull();
  expect(renderer.releasedPointers).toEqual([1, 1]);
  expect(materialized).toHaveLength(1);
  await host.dispose();
});

class PortConnectionRenderer implements CanvasRenderer {
  hit: HitResult | null = null;
  listener: RendererInputListener | undefined;
  readonly projections: Array<InteractionProjection | null> = [];
  readonly releasedPointers: number[] = [];

  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(projection: InteractionProjection | null): void {
    this.projections.push(projection);
  }
  subscribeInput(listener: RendererInputListener): () => void {
    this.listener = listener;
    return () => {
      this.listener = undefined;
    };
  }
  hitTest(_point: ScreenPoint): HitResult | null {
    return this.hit;
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(pointerId: number): void {
    this.releasedPointers.push(pointerId);
  }
  focus(): void {}
  dispose(): Promise<void> {
    return Promise.resolve();
  }
  emit(input: PointerInput): void {
    this.listener?.(input);
  }
}

function pointerInput(type: PointerInput['type'], point: Readonly<{ x: number; y: number }>): PointerInput {
  return {
    type,
    pointerId: 1,
    pointerType: 'mouse',
    screenPoint: point,
    worldPoint: point,
    button: type === 'pointer.down' ? 'primary' : null,
    pressedButtons: type === 'pointer.down' ? ['primary'] : [],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  };
}

function settleCommands(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
