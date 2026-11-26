import { expect, test } from 'bun:test';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPortContributionPlugin, portPlugin, portService, type PortService } from '@nodebraid/plugin-port';
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

import {
  createEdgeCommand,
  connectionFeedbackService,
  type ConnectionFeedbackService,
  interactionPlugin,
  type ConnectionMaterializationInput,
} from '../src';

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

test('Connection Gesture uses the materializer accepted before its getter changes', async () => {
  const renderer = new PortConnectionRenderer();
  const faults: unknown[] = [];
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  let kernel: KernelService | undefined;
  let reads = 0;
  const materialized: ConnectionMaterializationInput[] = [];
  const materializeEdge = (input: ConnectionMaterializationInput) => {
    materialized.push(input);
    return { id: edgeId('captured-edge'), type: 'flow', ...input, data: null };
  };
  const interaction = host.install(interactionPlugin, {
    connection: {
      get materializeEdge() {
        return ++reads === 1 ? materializeEdge : (null as never);
      },
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    interaction,
    host.install(
      definePlugin({
        requires: { kernel: kernelService },
        setup(context) {
          kernel = context.services.kernel;
        },
      }),
    ),
  ];

  try {
    await Promise.all(installations.map((installation) => installation.whenActive()));
    if (!kernel) throw new Error('Expected Kernel Service.');
    const sourceId = nodeId('captured-source');
    const targetId = nodeId('captured-target');
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null });
    });
    renderer.hit = { type: 'connection-anchor', nodeId: sourceId, role: 'source', worldPoint: { x: 0, y: 0 } };
    renderer.emit(pointerInput('pointer.down', { x: 0, y: 0 }));
    renderer.hit = { type: 'connection-anchor', nodeId: targetId, role: 'target', worldPoint: { x: 100, y: 0 } };
    renderer.emit(pointerInput('pointer.move', { x: 100, y: 0 }));
    renderer.emit(pointerInput('pointer.up', { x: 100, y: 0 }));
    await settleCommands();

    expect(materialized).toEqual([{ source: { nodeId: sourceId }, target: { nodeId: targetId } }]);
    expect(kernel.read().snapshot).toMatchObject({ revision: 2, edges: [{ id: edgeId('captured-edge') }] });
    expect(reads).toBe(1);
    expect(renderer.releasedPointers).toEqual([1]);
    expect(renderer.projections.at(-1)).toBeNull();
    expect(faults).toEqual([]);
  } finally {
    await host.dispose();
  }
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

test('a stationary candidate follows commits; rejected feedback survives release and stale services expire', async () => {
  const renderer = new PortConnectionRenderer();
  const faults: unknown[] = [];
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault.error) } });
  let ports!: PortService;
  let insideWriter = false,
    writerRuleCalls = 0;
  let kernel!: KernelService, feedback!: ConnectionFeedbackService, commands!: CommandService;
  const a = nodeId('from'),
    b = nodeId('to');
  let materialized = 0,
    occupyOnMaterialize = false,
    commandEffect: (() => void) | undefined;
  function occupy() {
    kernel.transact((tx) =>
      tx.edges.add({ id: edgeId('occupied'), type: 'link', source: { nodeId: a }, target: { nodeId: b }, data: null }),
    );
  }
  const installations = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin, {
      connectionRule: ({ view, target }) => {
        if (insideWriter) writerRuleCalls++;
        commandEffect?.();
        return view.query.getIncomingEdges(target.nodeId).length
          ? { type: 'deny', reason: { code: 'FULL', message: 'Full' } }
          : { type: 'allow' };
      },
      connection: {
        materializeEdge(input) {
          materialized++;
          if (occupyOnMaterialize) occupy();
          return { ...input, id: edgeId('new'), type: 'link', data: null };
        },
      },
    }),
    host.install(
      definePlugin({
        requires: {
          ports: portService,
          kernel: kernelService,
          commands: commandService,
          feedback: connectionFeedbackService,
        },
        setup({ services }) {
          ports = services.ports;
          kernel = services.kernel;
          commands = services.commands;
          feedback = services.feedback;
        },
      }),
    ),
  ];
  try {
    await Promise.all(installations.map((i) => i.whenActive()));
    kernel.transact((tx) => {
      for (const id of [a, b]) tx.nodes.add({ id, type: 'node', position: { x: 0, y: 0 }, data: null });
    });
    const point = { x: 0, y: 0 };
    function start() {
      renderer.hit = { type: 'connection-anchor', nodeId: a, role: 'source', worldPoint: point };
      renderer.emit(pointerInput('pointer.down', point));
      renderer.hit = { type: 'connection-anchor', nodeId: b, role: 'target', worldPoint: point };
      renderer.emit(pointerInput('pointer.move', point));
    }
    let calls = 0;
    const listener = () => {
      calls++;
    };
    const stopOld = feedback.subscribe(listener);
    stopOld();
    const stopCurrent = feedback.subscribe(listener);
    stopOld();
    const failure = new Error('listener failed');
    const stopThrowing = feedback.subscribe(() => {
      throw failure;
    });
    start();
    expect(calls).toBe(2);
    expect(faults.splice(0)).toEqual([failure, failure]);
    stopCurrent();
    stopThrowing();
    const valid = feedback.getSnapshot();
    renderer.emit(pointerInput('pointer.move', point));
    expect(feedback.getSnapshot()).toBe(valid);
    const input = {
      edge: { id: edgeId('direct'), type: 'link', source: { nodeId: a }, target: { nodeId: b }, data: null },
      source: { nodeId: a, role: 'source' as const },
      target: { nodeId: b, role: 'target' as const },
    };
    await expect(
      commands.execute(createEdgeCommand, {
        ...input,
        edge: {
          ...input.edge,
          get data() {
            insideWriter = true;
            try {
              ports.register({ id: 'late', definePorts: () => [] });
              return null;
            } finally {
              insideWriter = false;
            }
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'STALE_GESTURE' });
    expect(writerRuleCalls).toBe(0);
    expect(feedback.getSnapshot()).toBe(valid);
    commandEffect = () => {
      commandEffect = undefined;
      occupy();
    };
    await expect(commands.execute(createEdgeCommand, input)).rejects.toMatchObject({ code: 'STALE_GESTURE' });

    expect(feedback.getSnapshot()).toMatchObject({
      type: 'preview',
      target: { type: 'invalid', reason: { origin: 'rule', code: 'FULL' } },
    });
    const previousFailure = await commands.execute(createEdgeCommand, input).catch((error: unknown) => error);
    expect(previousFailure).toMatchObject({ code: 'CONNECTION_REJECTED' });
    kernel.transact((tx) => tx.edges.remove(edgeId('occupied')));
    expect(feedback.getSnapshot()).toEqual(valid);
    occupy();
    renderer.emit(pointerInput('pointer.up', point));
    expect(renderer.projections.at(-1)).toBeNull();
    expect(materialized).toBe(0);
    expect(feedback.getSnapshot()).toMatchObject({ type: 'rejected', reason: { code: 'FULL' } });
    kernel.transact((tx) => tx.edges.remove(edgeId('occupied')));
    start();
    occupyOnMaterialize = true;
    renderer.emit(pointerInput('pointer.up', point));
    await settleCommands();
    expect(materialized).toBe(1);
    expect(feedback.getSnapshot()).toMatchObject({ type: 'rejected', reason: { code: 'FULL' } });
    expect(kernel.read().query.getEdge(edgeId('new'))).toBeUndefined();
    kernel.transact((tx) => tx.edges.remove(edgeId('occupied')));
    start();
    renderer.emit(pointerInput('pointer.up', point));
    start(); // A newer connection owns feedback before the first rejection settles.
    await settleCommands();
    expect(feedback.getSnapshot()).toMatchObject({ type: 'preview' });
    occupyOnMaterialize = false;
    kernel.transact((tx) => tx.edges.remove(edgeId('occupied')));
    const trigger = feedback.subscribe(() => {
      if (feedback.getSnapshot().type === 'idle')
        commandEffect = () => {
          throw previousFailure;
        };
    });
    renderer.emit(pointerInput('pointer.up', point));
    await settleCommands();
    expect(faults.splice(0)).toEqual([previousFailure]);
    expect(feedback.getSnapshot()).toMatchObject({ type: 'idle' });
    trigger();
    commandEffect = undefined;
    // Subsequent listeners see the same preview before the reentrant cancellation is delivered.
    const observations: string[] = [];
    const cancel = feedback.subscribe(() => {
      if (feedback.getSnapshot().type === 'preview') renderer.emit(pointerInput('pointer.cancel', point));
    });
    const observe = feedback.subscribe(() => observations.push(feedback.getSnapshot().type));
    start();
    expect(observations).toEqual(['preview', 'idle']);
    cancel();
    observe();
  } finally {
    await host.dispose();
  }
  expect(() => feedback.getSnapshot()).toThrow('Activation has ended');
});
