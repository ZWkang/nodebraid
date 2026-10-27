import { expect, test } from 'bun:test';
import { edgeId, nodeId, type CanvasCommit, type CanvasEdge } from '@nodebraid/kernel';
import type { DiagnosticFault } from '@nodebraid/diagnostics';
import { commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import {
  historyService,
  establishHistoryBaselineCommand,
  undoCommand,
  redoCommand,
  type HistoryService,
} from '@nodebraid/plugin-history';
import type { HitResult, PointerInput, RendererInputListener, ScreenPoint } from '@nodebraid/renderer-api';
import type { InteractionProjection } from '@nodebraid/interaction-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';
import type {
  ConnectionConfig,
  ConnectionMaterializationInput,
  ConnectionMaterializer,
} from '@nodebraid/plugin-interaction';

import { createBasicCanvasPlugin } from '../src';
import { TestCanvasRenderer } from './test-renderer';

test('Composition retains a declared Connection materializer inherited from its prototype', async () => {
  class InheritedConnection implements ConnectionConfig {
    materializeEdge(input: ConnectionMaterializationInput) {
      return {
        id: edgeId('inherited-edge'),
        type: 'link',
        source: input.source,
        target: input.target,
        data: null,
      };
    }
  }

  const renderer = new TestCanvasRenderer();
  const plugin = createBasicCanvasPlugin((_config: Readonly<{ targetId: string }>) => renderer, {
    interaction: { connection: new InheritedConnection() },
  });
  const host = createPluginHost();
  const composition = host.install(plugin, { targetId: 'inherited-materializer' });
  try {
    await composition.whenActive();
    expect(composition.getSnapshot()).toEqual({ status: 'active' });
  } finally {
    await host.dispose();
  }
  expect(renderer.disposed).toBe(true);
});

type Shape = 'inherited' | 'non-enumerable' | 'enumerable';
const shapes: Shape[] = ['inherited', 'non-enumerable', 'enumerable'];

function connectionWithGetter(shape: Shape, read: (receiver: unknown) => ConnectionMaterializer): ConnectionConfig {
  class Inherited implements ConnectionConfig {
    get materializeEdge(): ConnectionMaterializer {
      return read(this);
    }
  }
  const own = {
    get materializeEdge(): ConnectionMaterializer {
      return read(this);
    },
  };
  if (shape === 'non-enumerable') Object.defineProperty(own, 'materializeEdge', { enumerable: false });
  return shape === 'inherited' ? new Inherited() : own;
}

function expectThrownValue(action: () => unknown, original: unknown): void {
  let threw = false;
  let caught: unknown;
  try {
    action();
  } catch (error) {
    threw = true;
    caught = error;
  }
  expect(threw).toBe(true);
  expect(caught).toBe(original);
}

for (const shape of shapes) {
  test(`Composition retains the ${shape} materializer across mutation and fresh Hosts`, async () => {
    const renderers: ConnectionRenderer[] = [];
    const configurations: Readonly<{ targetId: string }>[] = [];
    const materialized: ConnectionMaterializationInput[] = [];
    const opaque = { caller: Symbol(shape) };
    const acceptedId = edgeId('captured-' + shape);
    let laterCalls = 0;
    const accepted: ConnectionMaterializer = (input) => {
      materialized.push(input);
      return { id: acceptedId, type: 'link', source: input.source, target: input.target, data: opaque };
    };
    let current: ConnectionMaterializer = accepted;
    let reads = 0;
    const supplied = connectionWithGetter(shape, (receiver) => {
      expect(receiver).toBe(supplied);
      reads += 1;
      return current;
    });
    const originalPrototype = Object.getPrototypeOf(supplied);
    const plugin = createBasicCanvasPlugin(
      (configuration: Readonly<{ targetId: string }>) => {
        configurations.push(configuration);
        const renderer = new ConnectionRenderer();
        renderers.push(renderer);
        return renderer;
      },
      { interaction: { connection: supplied } },
    );
    expect(reads).toBe(1);
    current = (input) => {
      laterCalls += 1;
      return { id: edgeId('later'), type: 'wrong-materializer', ...input, data: null };
    };
    expect(Object.isFrozen(supplied)).toBe(false);
    expect(Object.getPrototypeOf(supplied)).toBe(originalPrototype);

    for (const targetId of ['first', 'second']) {
      const faults: DiagnosticFault[] = [];
      const host = createPluginHost({
        diagnostics: {
          faultReporter: (fault) => {
            faults.push(fault);
          },
        },
      });
      let services: { kernel: KernelService; commands: CommandService; history: HistoryService } | undefined;
      const configuration = { targetId };
      const composition = host.install(plugin, configuration);
      const consumer = host.install(
        definePlugin({
          requires: { kernel: kernelService, commands: commandService, history: historyService },
          setup(context) {
            services = context.services;
          },
        }),
      );
      try {
        await Promise.all([composition.whenActive(), consumer.whenActive()]);
        expect(services).toBeDefined();
        if (!services) throw new Error('Expected public Basic Services.');
        expect(configurations.at(-1)).toBe(configuration);
        const renderer = renderers.at(-1)!;
        const { kernel, commands, history } = services;
        const sourceId = nodeId('source'),
          targetNodeId = nodeId('target');
        kernel.transact((transaction) => {
          transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
          transaction.nodes.add({ id: targetNodeId, type: 'task', position: { x: 100, y: 0 }, data: null });
        });
        await commands.execute(establishHistoryBaselineCommand, () => {});
        const before = kernel.read();
        const commits: CanvasCommit[] = [];
        const stop = kernel.observeCommits((commit) => {
          commits.push(commit);
        });
        const countBefore = materialized.length;
        renderer.hit = { type: 'connection-anchor', nodeId: sourceId, role: 'source', worldPoint: { x: 0, y: 0 } };
        renderer.emit(pointerInput('pointer.down', { x: 0, y: 0 }));
        renderer.hit = {
          type: 'connection-anchor',
          nodeId: targetNodeId,
          role: 'target',
          worldPoint: { x: 100, y: 0 },
        };
        renderer.emit(pointerInput('pointer.move', { x: 100, y: 0 }));
        renderer.emit(pointerInput('pointer.up', { x: 100, y: 0 }));
        await settleCommands();
        expect(materialized.length).toBe(countBefore + 1);
        expect(materialized.at(-1)).toEqual({ source: { nodeId: sourceId }, target: { nodeId: targetNodeId } });
        expect(laterCalls).toBe(0);
        expect(reads).toBe(1);
        expect(commits.length).toBe(1);
        expect(commits[0]!.before).toBe(before);
        expect(commits[0]!.after).toBe(kernel.read());
        expect(kernel.read().query.getEdge(acceptedId)).toEqual({
          id: acceptedId,
          type: 'link',
          source: { nodeId: sourceId },
          target: { nodeId: targetNodeId },
          data: opaque,
        });
        expect(kernel.read().query.getEdge(acceptedId)!.data).toBe(opaque);
        expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
        expect(renderer.released).toEqual([1]);
        expect(renderer.projections.at(-1)).toBeNull();
        await commands.execute(undoCommand, undefined);
        expect(kernel.read().query.getEdge(acceptedId)).toBeUndefined();
        await commands.execute(redoCommand, undefined);
        expect(kernel.read().query.getEdge(acceptedId)!.data).toBe(opaque);
        expect(materialized.length).toBe(countBefore + 1);
        expect(faults).toEqual([]);
        stop();
      } finally {
        await host.dispose();
      }
      expect(composition.getSnapshot().status).toBe('disposed');
      expect(consumer.getSnapshot().status).toBe('disposed');
      expect(renderers.at(-1)!.disposed).toBe(true);
      expect(renderers.at(-1)!.listener).toBeUndefined();
    }
    expect(reads).toBe(1);
    expect(materialized.length).toBe(2);
  });
}

const failures: unknown[] = [undefined, null, false, 0, '', Symbol('materializer read')];
for (const shape of shapes) {
  for (const [index, original] of failures.entries()) {
    test(`Composition preserves the first ${shape} materializer read failure ${index}`, () => {
      let reads = 0,
        factoryCalls = 0;
      const supplied = connectionWithGetter(shape, (receiver) => {
        expect(receiver).toBe(supplied);
        reads += 1;
        throw original;
      });
      expectThrownValue(
        () =>
          createBasicCanvasPlugin(
            () => {
              factoryCalls += 1;
              return new TestCanvasRenderer();
            },
            { interaction: { connection: supplied } },
          ),
        original,
      );
      expect(reads).toBe(1);
      expect(factoryCalls).toBe(0);
      expect(Object.isFrozen(supplied)).toBe(false);
    });
  }
}

for (const [index, invalid] of failures.entries()) {
  test(`Composition retains an invalid first inherited callback for existing validation ${index}`, async () => {
    let reads = 0;
    const valid: ConnectionMaterializer = (input) => ({
      id: edgeId('valid-later'),
      type: 'link',
      ...input,
      data: null,
    });
    const supplied = connectionWithGetter('inherited', () => {
      reads += 1;
      return (reads === 1 ? invalid : valid) as ConnectionMaterializer;
    });
    const renderer = new TestCanvasRenderer();
    const plugin = createBasicCanvasPlugin(() => renderer, { interaction: { connection: supplied } });
    expect(reads).toBe(1);
    const host = createPluginHost(),
      composition = host.install(plugin);
    try {
      await expect(composition.whenActive()).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
      expect(reads).toBe(1);
    } finally {
      await host.dispose();
    }
    expect(renderer.disposed).toBe(true);
  });
}

test('Composition preserves original own-key reflection failure before reading an inherited callback', () => {
  const first = new Error('ownKeys first'),
    later = new Error('callback later');
  let callbackReads = 0;
  const supplied = connectionWithGetter('inherited', () => {
    callbackReads += 1;
    throw later;
  });
  const proxy = new Proxy(supplied, {
    ownKeys() {
      throw first;
    },
  });
  expectThrownValue(
    () => createBasicCanvasPlugin(() => new TestCanvasRenderer(), { interaction: { connection: proxy } }),
    first,
  );
  expect(callbackReads).toBe(0);
});

test('Composition preserves unknown own Connection fields for Interaction validation', async () => {
  let calls = 0;
  const connection = {
    unexpected: true,
    materializeEdge(input: ConnectionMaterializationInput): CanvasEdge {
      calls += 1;
      return { id: edgeId('unexpected'), type: 'link', ...input, data: null };
    },
  };
  const host = createPluginHost();
  const composition = host.install(
    createBasicCanvasPlugin(() => new TestCanvasRenderer(), { interaction: { connection } }),
  );
  try {
    await expect(composition.whenActive()).rejects.toMatchObject({
      code: 'INVALID_CONFIG',
      message: 'Interaction connection config contains an unknown field.',
    });
    expect(calls).toBe(0);
  } finally {
    await host.dispose();
  }
});

class ConnectionRenderer extends TestCanvasRenderer {
  hit: HitResult | null = null;
  listener: RendererInputListener | undefined;
  readonly projections: Array<InteractionProjection | null> = [];
  readonly released: number[] = [];
  override updateInteraction(projection: InteractionProjection | null): void {
    this.projections.push(projection);
  }
  override subscribeInput(listener: RendererInputListener): () => void {
    this.listener = listener;
    return () => {
      this.listener = undefined;
    };
  }
  override hitTest(_point: ScreenPoint): HitResult | null {
    return this.hit;
  }
  override releasePointer(pointerId: number): void {
    this.released.push(pointerId);
  }
  override async dispose(): Promise<void> {
    this.listener = undefined;
    await super.dispose();
  }
  emit(input: PointerInput): void {
    if (!this.listener) throw new Error('Expected active public Input subscription.');
    this.listener(input);
  }
}

function pointerInput(type: PointerInput['type'], point: { x: number; y: number }): PointerInput {
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
