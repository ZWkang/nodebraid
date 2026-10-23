import { expect, test } from 'bun:test';

import { InteractionError } from '@nodebraid/plugin-interaction';
import type { CanvasRenderer } from '@nodebraid/renderer-api';
import { createPluginHost } from '@nodebraid/runtime-cordis';

import { createBasicCanvasPlugin } from '../src';
import { TestCanvasRenderer } from './test-renderer';

test('invalid Interaction options fail the Composition with the original Interaction error', async () => {
  const plugin = createBasicCanvasPlugin(
    (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(),
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
    (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(),
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

test('Composition snapshots nested Connection options when the Plugin is created', async () => {
  const connection = {
    materializeEdge() {
      return {
        id: 'snapshotted-edge' as never,
        type: 'flow',
        source: { nodeId: 'source' as never },
        target: { nodeId: 'target' as never },
        data: null,
      };
    },
  };
  const plugin = createBasicCanvasPlugin(
    (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(),
    { interaction: { connection } },
  );
  connection.materializeEdge = null as never;
  const host = createPluginHost();
  const composition = host.install(plugin, { targetId: 'snapshotted-connection' });

  try {
    await expect(composition.whenActive()).resolves.toBeUndefined();
    expect(composition.getSnapshot()).toEqual({ status: 'active' });
  } finally {
    await host.dispose();
  }
});

test('Composition keeps the Connection value captured before a caller getter changes', async () => {
  let reads = 0;
  const connection = {
    materializeEdge() {
      throw new Error('Connection materialization is not requested by this readiness test.');
    },
  };
  const plugin = createBasicCanvasPlugin(
    (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(),
    {
      interaction: {
        get connection() {
          return ++reads === 1 ? undefined : connection;
        },
      },
    },
  );
  connection.materializeEdge = null as never;
  const host = createPluginHost();
  const composition = host.install(plugin, { targetId: 'changing-connection' });

  try {
    await expect(composition.whenActive()).resolves.toBeUndefined();
    expect(reads).toBe(1);
    expect(composition.getSnapshot()).toEqual({ status: 'active' });
  } finally {
    await host.dispose();
  }
});

test.each(['inherited', 'non-enumerable'] as const)(
  'Composition owns %s Connection options across fresh Host installations',
  async (kind) => {
    let reads = 0;
    const connection = {
      materializeEdge() {
        throw new Error('Connection materialization is not requested by this readiness test.');
      },
    };
    const properties = {
      get connection() {
        reads += 1;
        return connection;
      },
    };
    const interaction =
      kind === 'inherited'
        ? Object.create(properties)
        : Object.defineProperty({}, 'connection', { get: () => properties.connection });
    const plugin = createBasicCanvasPlugin(
      (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(),
      { interaction },
    );
    connection.materializeEdge = null as never;

    for (const targetId of ['first-host', 'second-host']) {
      const host = createPluginHost();
      const composition = host.install(plugin, { targetId });
      try {
        await expect(composition.whenActive()).resolves.toBeUndefined();
      } finally {
        await host.dispose();
      }
    }
    expect(reads).toBe(1);
  },
);

test('Composition preserves the original Connection getter failure at creation', () => {
  const originalError = new Error('connection read failed');
  let actualError: unknown;
  try {
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(), {
      interaction: {
        get connection(): never {
          throw originalError;
        },
      },
    });
  } catch (error) {
    actualError = error;
  }
  expect(actualError).toBe(originalError);
});

test('Composition leaves malformed Connection validation with Interaction', async () => {
  const plugin = createBasicCanvasPlugin(
    (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(),
    { interaction: { connection: null as never } },
  );
  const host = createPluginHost();
  const composition = host.install(plugin, { targetId: 'invalid-connection' });

  try {
    const error = await composition.whenActive().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(InteractionError);
    expect(error).toMatchObject({ domain: 'interaction', code: 'INVALID_CONFIG' });
    expect(composition.getSnapshot()).toEqual({ status: 'failed', error });
  } finally {
    await host.dispose();
  }
});

test('Composition creation rejects malformed or unknown top-level options', () => {
  const factory = (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer();

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

    resolveRenderer(new TestCanvasRenderer());
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
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer()),
    { targetId: 'replacement-renderer' },
  );

  try {
    await expect(replacement.whenActive()).resolves.toBeUndefined();
  } finally {
    await host.dispose();
  }
});
