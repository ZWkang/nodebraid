import { expect, test } from 'bun:test';

import type { InteractionProjection } from '@cflow/interaction-api';
import { InteractionError } from '@cflow/plugin-interaction';
import type { SessionSnapshot } from '@cflow/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@cflow/renderer-api';
import { createPluginHost } from '@cflow/runtime-cordis';

import { createBasicCanvasPlugin } from '../src';

test('invalid Interaction options fail the Composition with the original Interaction error', async () => {
  const plugin = createBasicCanvasPlugin(
    (_config: Readonly<{ readonly targetId: string }>) => new ReadinessRenderer(),
    { interaction: { minZoom: 2, maxZoom: 1 } },
  );
  const host = createPluginHost();
  const composition = host.install(plugin, { targetId: 'invalid-interaction' });

  try {
    const error = await composition.whenActive().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(InteractionError);
    expect(error).toMatchObject({ domain: 'interaction', code: 'INVALID_CONFIG' });
    expect(composition.getSnapshot()).toEqual({ status: 'failed', error });
  } finally {
    await host.dispose();
  }
});

test('Composition snapshots Interaction options when the Plugin is created', async () => {
  const interaction = { minZoom: 0.5, maxZoom: 2 };
  const plugin = createBasicCanvasPlugin(
    (_config: Readonly<{ readonly targetId: string }>) => new ReadinessRenderer(),
    { interaction },
  );
  interaction.minZoom = 3;
  const host = createPluginHost();
  const composition = host.install(plugin, { targetId: 'snapshotted-interaction' });

  try {
    await expect(composition.whenActive()).resolves.toBeUndefined();
    expect(composition.getSnapshot()).toEqual({ status: 'active' });
  } finally {
    await host.dispose();
  }
});

test('Composition creation rejects malformed or unknown top-level options', () => {
  const factory = (_config: Readonly<{ readonly targetId: string }>) => new ReadinessRenderer();

  expect(() => createBasicCanvasPlugin(factory, null as never)).toThrow(TypeError);
  expect(() => createBasicCanvasPlugin(factory, { interaction: {}, unexpected: true } as never)).toThrow(TypeError);
});

test('Composition waits for an asynchronous Renderer before becoming active', async () => {
  let resolveRenderer!: (renderer: CanvasRenderer) => void;
  const rendererReady = new Promise<CanvasRenderer>((resolve) => {
    resolveRenderer = resolve;
  });
  const plugin = createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => rendererReady);
  const host = createPluginHost();
  const composition = host.install(plugin, { targetId: 'async-renderer' });
  let active = false;
  const readiness = composition.whenActive().then(() => {
    active = true;
  });

  try {
    await Promise.resolve();
    expect(active).toBeFalse();
    expect(composition.getSnapshot()).toEqual({ status: 'pending', missing: [] });

    resolveRenderer(new ReadinessRenderer());
    await readiness;

    expect(active).toBeTrue();
    expect(composition.getSnapshot()).toEqual({ status: 'active' });
  } finally {
    await host.dispose();
  }
});

test('Renderer Factory failure keeps its identity and releases the Child tree for reinstall', async () => {
  const factoryError = new Error('renderer factory failed');
  const failedPlugin = createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => {
    throw factoryError;
  });
  const host = createPluginHost();
  const failedComposition = host.install(failedPlugin, { targetId: 'failed-renderer' });

  const error = await failedComposition.whenActive().catch((reason: unknown) => reason);
  expect(error).toBe(factoryError);
  expect(failedComposition.getSnapshot()).toEqual({ status: 'failed', error: factoryError });

  await failedComposition.dispose();
  const replacement = host.install(
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => new ReadinessRenderer()),
    { targetId: 'replacement-renderer' },
  );

  try {
    await expect(replacement.whenActive()).resolves.toBeUndefined();
  } finally {
    await host.dispose();
  }
});

class ReadinessRenderer implements CanvasRenderer {
  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(_projection: InteractionProjection | null): void {}
  subscribeInput(_listener: RendererInputListener): () => void {
    return () => undefined;
  }
  hitTest(point: ScreenPoint): HitResult | null {
    return { type: 'canvas', worldPoint: point };
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}
  async dispose(): Promise<void> {}
}
