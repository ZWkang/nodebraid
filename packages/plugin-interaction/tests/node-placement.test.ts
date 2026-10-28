import { expect, test } from 'bun:test';

import type { DiagnosticFault } from '@nodebraid/diagnostics';
import { nodeId, type CanvasNode, type Point } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { historyPlugin, historyService, undoCommand, type HistoryService } from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { nodeEditingPlugin } from '@nodebraid/plugin-node-editing';
import { portPlugin } from '@nodebraid/plugin-port';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererInput,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { interactionPlugin, nodePlacementService, type InteractionConfig, type NodePlacementService } from '../src';

const firstId = nodeId('existing-a');
const secondId = nodeId('existing-b');

test('one placement creates at the accepted world point, selects the Node and records one Undo', async () => {
  const f = await fixture();
  try {
    f.session.setViewport({ x: 10, y: 20, zoom: 2 });
    const before = f.kernel.read();
    const request = f.placement.begin(({ worldPoint }) => makeNode('created', worldPoint));
    f.renderer.click({ x: 110, y: 140 });
    const result = await request.result;
    expect(result.type).toBe('created');
    if (result.type !== 'created') throw new Error('Expected created result.');
    expect(result.nodeId).toBe(nodeId('created'));
    expect(result.commit.before).toBe(before);
    expect(f.kernel.read().query.getNode(result.nodeId)?.position).toEqual({ x: 50, y: 60 });
    expect(f.session.getSnapshot().selection.nodeIds).toEqual([result.nodeId]);
    expect(f.history.getSnapshot().canUndo).toBe(true);
    await f.commands.execute(undoCommand, undefined);
    expect(f.kernel.read().query.getNode(result.nodeId)).toBeUndefined();
    expect(f.kernel.read().snapshot.nodes).toHaveLength(2);
    expect(f.renderer.captured.size).toBe(0);
  } finally {
    await f.host.dispose();
  }
});

test('entity clicks and drags do not create or run ordinary selection while placement remains armed', async () => {
  const f = await fixture();
  try {
    const before = f.kernel.read();
    const selection = f.session.getSnapshot().selection;
    let calls = 0;
    const request = f.placement.begin(({ worldPoint }) => {
      calls += 1;
      return makeNode('created', worldPoint);
    });
    f.renderer.hitNode = secondId;
    f.renderer.click({ x: 100, y: 100 });
    f.renderer.hitNode = undefined;
    f.renderer.pointer('pointer.down', { x: 100, y: 100 });
    f.renderer.pointer('pointer.move', { x: 130, y: 100 });
    f.renderer.pointer('pointer.move', { x: 100, y: 100 });
    f.renderer.pointer('pointer.up', { x: 100, y: 100 });
    expect(calls).toBe(0);
    expect(f.kernel.read()).toBe(before);
    expect(f.session.getSnapshot().selection).toBe(selection);
    f.renderer.click({ x: 140, y: 100 });
    expect((await request.result).type).toBe('created');
    expect(calls).toBe(1);
    f.renderer.click({ x: 200, y: 200 });
    expect(f.kernel.read().snapshot.nodes).toHaveLength(3);
    expect(f.session.getSnapshot().selection.nodeIds).toEqual([]);
  } finally {
    await f.host.dispose();
  }
});

test('replacement, old cancellation and Escape preserve request identity and the graph', async () => {
  const f = await fixture();
  try {
    const before = f.kernel.read();
    const first = f.placement.begin(({ worldPoint }) => makeNode('first', worldPoint));
    f.renderer.pointer('pointer.down', { x: 100, y: 100 });
    const second = f.placement.begin(({ worldPoint }) => makeNode('second', worldPoint));
    expect(await first.result).toEqual({ type: 'cancelled' });
    expect(f.renderer.captured.size).toBe(0);
    first.cancel();
    f.renderer.pointer('pointer.up', { x: 100, y: 100 });
    expect(f.kernel.read()).toBe(before);
    f.renderer.key('Escape');
    expect(await second.result).toEqual({ type: 'cancelled' });
    expect(f.kernel.read()).toBe(before);
    const third = f.placement.begin(({ worldPoint }) => makeNode('third', worldPoint));
    second.cancel();
    f.renderer.click({ x: 110, y: 120 });
    expect((await third.result).type).toBe('created');
  } finally {
    await f.host.dispose();
  }
});

test('a Viewport change invalidates only the candidate click and retains placement', async () => {
  const f = await fixture();
  try {
    let calls = 0;
    const request = f.placement.begin(({ worldPoint }) => {
      calls += 1;
      return makeNode('created', worldPoint);
    });
    f.renderer.pointer('pointer.down', { x: 100, y: 100 });
    f.session.setViewport({ x: 40, y: 20, zoom: 2 });
    f.renderer.pointer('pointer.up', { x: 100, y: 100 });
    expect(calls).toBe(0);
    expect(f.renderer.captured.size).toBe(0);
    f.renderer.click({ x: 140, y: 120 });
    await request.result;
    expect(calls).toBe(1);
    expect(f.kernel.read().query.getNode(nodeId('created'))?.position).toEqual({ x: 50, y: 50 });
  } finally {
    await f.host.dispose();
  }
});

test('materializer and duplicate-ID failures reject without changing graph or Selection', async () => {
  const f = await fixture();
  try {
    const before = f.kernel.read();
    const selection = f.session.getSnapshot().selection;
    const failure = new Error('application materializer failed');
    const failing = f.placement.begin(() => {
      throw failure;
    });
    const observed = failing.result.catch((error: unknown) => error);
    f.renderer.click({ x: 100, y: 100 });
    expect(await observed).toBe(failure);
    const duplicate = f.placement.begin(({ worldPoint }) => makeNode(firstId, worldPoint));
    const rejected = duplicate.result.catch((error: unknown) => error);
    f.renderer.click({ x: 100, y: 100 });
    expect(await rejected).toBeInstanceOf(Error);
    expect(f.kernel.read()).toBe(before);
    expect(f.session.getSnapshot().selection).toBe(selection);
    expect(f.renderer.captured.size).toBe(0);
  } finally {
    await f.host.dispose();
  }
});

test('cancellation during materialization prevents a later write', async () => {
  const f = await fixture();
  try {
    const before = f.kernel.read();
    const request = f.placement.begin(({ worldPoint }) => {
      request.cancel();
      return makeNode('cancelled', worldPoint);
    });
    f.renderer.click({ x: 100, y: 100 });
    expect(await request.result).toEqual({ type: 'cancelled' });
    expect(f.kernel.read()).toBe(before);
  } finally {
    await f.host.dispose();
  }
});

test('post-commit Selection changes are not overwritten by placement completion', async () => {
  const f = await fixture();
  try {
    const stop = f.kernel.observeCommits((commit) => {
      if (commit.after.query.getNode(nodeId('created'))) {
        f.session.setSelection({ nodeIds: [secondId], edgeIds: [] });
      }
    });
    const request = f.placement.begin(({ worldPoint }) => makeNode('created', worldPoint));
    f.renderer.click({ x: 100, y: 100 });
    expect((await request.result).type).toBe('created');
    expect(f.session.getSnapshot().selection.nodeIds).toEqual([secondId]);
    stop();
  } finally {
    await f.host.dispose();
  }
});

test('lifecycle disposal cancels waiting placement and releases its captured Pointer', async () => {
  const f = await fixture();
  const before = f.kernel.read();
  const request = f.placement.begin(({ worldPoint }) => makeNode('cancelled', worldPoint));
  f.renderer.pointer('pointer.down', { x: 100, y: 100 });
  await f.interaction.dispose();
  expect(await request.result).toEqual({ type: 'cancelled' });
  expect(f.renderer.captured.size).toBe(0);
  expect(f.kernel.read()).toBe(before);
  expect(() => f.placement.begin(({ worldPoint }) => makeNode('late', worldPoint))).toThrow();
  await f.host.dispose();
});

test('a zero drag threshold still accepts a stationary click', async () => {
  const f = await fixture({ dragThreshold: 0 });
  try {
    const request = f.placement.begin(({ worldPoint }) => makeNode('created', worldPoint));
    f.renderer.click({ x: 100, y: 100 });
    expect(f.kernel.read().query.getNode(nodeId('created'))).toBeDefined();
    expect((await request.result).type).toBe('created');
  } finally {
    await f.host.dispose();
  }
});

test('reentrant begin during Focus supersedes the outer request without losing either result', async () => {
  const f = await fixture();
  try {
    let replacement: ReturnType<NodePlacementService['begin']> | undefined;
    f.renderer.onFocus = () => {
      f.renderer.onFocus = undefined;
      replacement = f.placement.begin(({ worldPoint }) => makeNode('replacement', worldPoint));
    };
    const outer = f.placement.begin(({ worldPoint }) => makeNode('outer', worldPoint));
    let outerResult: unknown;
    void outer.result.then((result) => {
      outerResult = result;
    });
    await Promise.resolve();
    expect(outerResult).toEqual({ type: 'cancelled' });
    if (!replacement) throw new Error('Expected reentrant replacement.');
    outer.cancel();
    f.renderer.click({ x: 100, y: 100 });
    expect((await replacement.result).type).toBe('created');
    expect(f.kernel.read().query.getNode(nodeId('outer'))).toBeUndefined();
  } finally {
    await f.host.dispose();
  }
});

test('Focus failure is the request failure and does not leave placement armed', async () => {
  const f = await fixture();
  try {
    const failure = new Error('focus failed');
    f.renderer.onFocus = () => {
      throw failure;
    };
    const request = f.placement.begin(({ worldPoint }) => makeNode('never', worldPoint));
    expect(await request.result.catch((error: unknown) => error)).toBe(failure);
    f.renderer.onFocus = undefined;
    f.renderer.click({ x: 100, y: 100 });
    expect(f.kernel.read().query.getNode(nodeId('never'))).toBeUndefined();
  } finally {
    await f.host.dispose();
  }
});

test('explicit cancellation exposes capture cleanup failure through its original error', async () => {
  const f = await fixture();
  try {
    const request = f.placement.begin(({ worldPoint }) => makeNode('never', worldPoint));
    const observed = request.result.catch((error: unknown) => error);
    f.renderer.pointer('pointer.down', { x: 100, y: 100 });
    const failure = new Error('release failed');
    f.renderer.releaseError = failure;
    expect(() => request.cancel()).toThrow(failure);
    expect(await observed).toBe(failure);
    expect(f.kernel.read().query.getNode(nodeId('never'))).toBeUndefined();
    f.renderer.releaseError = undefined;
  } finally {
    await f.host.dispose();
  }
});

test('an application failure after reentrant cancellation remains observable', async () => {
  const f = await fixture();
  try {
    const failure = new Error('materializer failed after cancellation');
    const request = f.placement.begin(() => {
      request.cancel();
      throw failure;
    });
    f.renderer.click({ x: 100, y: 100 });
    expect(await request.result).toEqual({ type: 'cancelled' });
    expect(f.faults.some((fault) => fault.error === failure)).toBe(true);
    expect(f.kernel.read().snapshot.nodes).toHaveLength(2);
  } finally {
    await f.host.dispose();
  }
});

test('armed placement retains normal zoom and pan before a candidate click', async () => {
  const f = await fixture();
  try {
    const before = f.kernel.read();
    const request = f.placement.begin(({ worldPoint }) => makeNode('created', worldPoint));
    f.renderer.emit({
      type: 'wheel',
      screenPoint: { x: 100, y: 100 },
      worldPoint: { x: 100, y: 100 },
      deltaX: 0,
      deltaY: -100,
      modifiers: { alt: false, control: false, meta: false, shift: false },
    });
    const zoomed = f.session.getSnapshot().viewport;
    expect(zoomed.zoom).toBeGreaterThan(1);
    f.renderer.key('Space');
    f.renderer.pointer('pointer.down', { x: 100, y: 100 });
    f.renderer.pointer('pointer.move', { x: 130, y: 120 });
    f.renderer.pointer('pointer.up', { x: 130, y: 120 });
    f.renderer.key('Space', 'key.up');
    expect(f.session.getSnapshot().viewport).toEqual({ x: zoomed.x + 30, y: zoomed.y + 20, zoom: zoomed.zoom });
    expect(f.kernel.read()).toBe(before);
    const expected = f.renderer.world({ x: 150, y: 160 });
    f.renderer.click({ x: 150, y: 160 });
    expect((await request.result).type).toBe('created');
    expect(f.kernel.read().query.getNode(nodeId('created'))?.position).toEqual(expected);
  } finally {
    await f.host.dispose();
  }
});

test('a failed placement Hit Test rejects the request without capturing a Pointer', async () => {
  const f = await fixture();
  try {
    const failure = new Error('hit test failed');
    const request = f.placement.begin(({ worldPoint }) => makeNode('never', worldPoint));
    const observed = request.result.catch((error: unknown) => error);
    f.renderer.hitError = failure;
    f.renderer.pointer('pointer.down', { x: 100, y: 100 });
    let result: unknown;
    void observed.then((error) => {
      result = error;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(result).toBe(failure);
    expect(f.renderer.captured.size).toBe(0);
    expect(f.kernel.read().snapshot.nodes).toHaveLength(2);
  } finally {
    await f.host.dispose();
  }
});

function makeNode(id: string, position: Point): CanvasNode {
  return { id: nodeId(id), type: 'test-node', position, size: { width: 80, height: 40 }, data: { label: id } };
}

async function fixture(config?: InteractionConfig) {
  let services:
    | {
        commands: CommandService;
        history: HistoryService;
        kernel: KernelService;
        session: SessionService;
        placement: NodePlacementService;
      }
    | undefined;
  const consumer = definePlugin({
    requires: {
      commands: commandService,
      history: historyService,
      kernel: kernelService,
      session: sessionService,
      placement: nodePlacementService,
    },
    setup(context) {
      services = context.services;
    },
  });
  const renderer = new PlacementRenderer();
  const faults: DiagnosticFault[] = [];
  const host = createPluginHost({
    diagnostics: {
      faultReporter: (fault) => {
        faults.push(fault);
      },
    },
  });
  const base = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(nodeEditingPlugin),
    host.install(portPlugin),
    host.install(sessionPlugin),
    host.install(historyPlugin),
    host.install(createRendererPlugin(() => renderer)),
  ];
  const interaction = host.install(interactionPlugin, config);
  await Promise.all([...base, interaction, host.install(consumer)].map((installation) => installation.whenActive()));
  if (!services) throw new Error('Expected placement runtime services.');
  services.kernel.transact((transaction) => {
    transaction.nodes.add(makeNode(firstId, { x: 0, y: 0 }));
    transaction.nodes.add(makeNode(secondId, { x: 0, y: 50 }));
  });
  services.session.setSelection({ nodeIds: [firstId], edgeIds: [] });
  return { ...services, host, renderer, interaction, faults };
}

class PlacementRenderer implements CanvasRenderer {
  readonly captured = new Set<number>();
  readonly listeners = new Set<RendererInputListener>();
  hitNode: ReturnType<typeof nodeId> | undefined;
  onFocus: (() => void) | undefined;
  releaseError: Error | undefined;
  hitError: Error | undefined;
  viewport = { x: 0, y: 0, zoom: 1 };

  updateDocument(): void {}
  updateSession(snapshot: SessionSnapshot): void {
    this.viewport = snapshot.viewport;
  }
  updateInteraction(): void {}
  subscribeInput(listener: RendererInputListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  hitTest(point: ScreenPoint): HitResult {
    if (this.hitError) throw this.hitError;
    const worldPoint = this.world(point);
    return this.hitNode ? { type: 'node', nodeId: this.hitNode, worldPoint } : { type: 'canvas', worldPoint };
  }
  capturePointer(pointerId: number): void {
    this.captured.add(pointerId);
  }
  releasePointer(pointerId: number): void {
    if (this.releaseError) throw this.releaseError;
    this.captured.delete(pointerId);
  }
  focus(): void {
    this.onFocus?.();
  }
  dispose(): Promise<void> {
    this.captured.clear();
    return Promise.resolve();
  }
  emit(input: RendererInput): void {
    for (const listener of this.listeners) listener(input);
  }
  world(point: ScreenPoint): Point {
    return { x: (point.x - this.viewport.x) / this.viewport.zoom, y: (point.y - this.viewport.y) / this.viewport.zoom };
  }
  pointer(type: 'pointer.down' | 'pointer.move' | 'pointer.up', point: ScreenPoint): void {
    this.emit({
      type,
      pointerId: 1,
      pointerType: 'mouse',
      screenPoint: point,
      worldPoint: this.world(point),
      button: type === 'pointer.move' ? null : 'primary',
      pressedButtons: type === 'pointer.up' ? [] : ['primary'],
      modifiers: { alt: false, control: false, meta: false, shift: false },
    });
  }
  click(point: ScreenPoint): void {
    this.pointer('pointer.down', point);
    this.pointer('pointer.up', point);
  }
  key(code: string, type: 'key.down' | 'key.up' = 'key.down'): void {
    this.emit({
      type,
      key: code,
      code,
      repeat: false,
      modifiers: { alt: false, control: false, meta: false, shift: false },
    });
  }
}
