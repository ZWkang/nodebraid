import { expect, test } from 'bun:test';

import type { DiagnosticEvent } from '@cflow/diagnostics';
import type { InteractionProjection } from '@cflow/interaction-api';
import { commandPlugin, commandService, type CommandService } from '@cflow/plugin-command';
import { undoCommand } from '@cflow/plugin-history';
import { moveNodesCommand } from '@cflow/plugin-interaction';
import { kernelPlugin } from '@cflow/plugin-kernel';
import { rendererService, type RendererService } from '@cflow/plugin-renderer';
import { sessionPlugin } from '@cflow/plugin-session';
import type { RendererInputListener } from '@cflow/renderer-api';
import { createPluginHost, definePlugin, PluginHostError } from '@cflow/runtime-cordis';

import { createBasicCanvasPlugin } from '../src';
import { TestCanvasRenderer } from './test-renderer';

test('existing standard Provider makes Basic Canvas Composition fail explicitly', async () => {
  const host = createPluginHost();
  const existingKernel = host.install(kernelPlugin);
  await existingKernel.whenActive();
  const composition = host.install(
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer()),
    { targetId: 'provider-conflict' },
  );

  try {
    const error = await composition.whenActive().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PluginHostError);
    expect(error).toMatchObject({
      code: 'PROVIDER_CONFLICT',
      details: { type: 'provider-conflict', serviceName: 'kernel' },
    });
  } finally {
    await host.dispose();
  }
});

test('second Basic Canvas Composition conflicts without disturbing the active one', async () => {
  const host = createPluginHost();
  const plugin = createBasicCanvasPlugin(
    (_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer(),
  );
  const first = host.install(plugin, { targetId: 'first-composition' });
  await first.whenActive();
  const second = host.install(plugin, { targetId: 'second-composition' });

  try {
    const error = await second.whenActive().catch((reason: unknown) => reason);
    expect(error).toMatchObject({ code: 'PROVIDER_CONFLICT', details: { serviceName: 'kernel' } });
    expect(first.getSnapshot()).toEqual({ status: 'active' });
  } finally {
    await host.dispose();
  }
});

test('a later Renderer Provider conflict rolls back earlier Child reservations', async () => {
  const host = createPluginHost();
  const occupiedRenderer = host.install(
    definePlugin({
      name: 'test.occupied-renderer',
      provides: { renderer: rendererService },
      setup() {
        return { renderer: createOccupiedRendererService() };
      },
    }),
  );
  await occupiedRenderer.whenActive();
  const composition = host.install(
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer()),
    { targetId: 'later-provider-conflict' },
  );

  const error = await composition.whenActive().catch((reason: unknown) => reason);
  expect(error).toMatchObject({ code: 'PROVIDER_CONFLICT', details: { serviceName: 'renderer' } });

  const kernel = host.install(kernelPlugin);
  const commands = host.install(commandPlugin);
  const session = host.install(sessionPlugin);
  await Promise.all([kernel.whenActive(), commands.whenActive(), session.whenActive()]);
  await Promise.all([session.dispose(), commands.dispose(), kernel.dispose(), occupiedRenderer.dispose()]);
  await composition.dispose();

  const replacement = host.install(
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer()),
    { targetId: 'replacement-after-conflict' },
  );
  try {
    await expect(replacement.whenActive()).resolves.toBeUndefined();
  } finally {
    await host.dispose();
  }
});

test('Composition disposes consumers before Renderer and awaits asynchronous Renderer cleanup', async () => {
  const renderer = new DeferredDisposalRenderer();
  const plugin = createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => renderer);
  const host = createPluginHost();
  let commands: CommandService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService },
    setup(context) {
      commands = context.services.commands;
    },
  });
  const composition = host.install(plugin, { targetId: 'deferred-disposal' });
  const consumerInstallation = host.install(consumer);
  await Promise.all([composition.whenActive(), consumerInstallation.whenActive()]);

  const disposal = composition.dispose();
  await renderer.disposeStarted;
  let disposalSettled = false;
  void disposal.then(() => {
    disposalSettled = true;
  });
  const undoError = await commands!.execute(undoCommand, undefined).catch((error: unknown) => error);
  const moveError = await commands!.execute(moveNodesCommand, { moves: [] }).catch((error: unknown) => error);

  expect(undoError).toMatchObject({ code: 'COMMAND_NOT_FOUND' });
  expect(moveError).toMatchObject({ code: 'COMMAND_NOT_FOUND' });
  expect(disposalSettled).toBeFalse();

  renderer.finishDisposal();
  await disposal;

  expect(disposalSettled).toBeTrue();
  expect(renderer.disposed).toBeTrue();
  await host.dispose();
});

test('Composition cleanup attempts every Renderer resource and preserves all failures', async () => {
  const renderer = new FailingCleanupRenderer();
  const host = createPluginHost();
  const composition = host.install(
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => renderer),
    { targetId: 'failing-cleanup' },
  );
  await composition.whenActive();

  const disposalError = await composition.dispose().catch((error: unknown) => error);
  const leaves = collectAggregateLeaves(disposalError);

  expect(disposalError).toBeInstanceOf(AggregateError);
  expect(leaves).toHaveLength(3);
  expect(leaves).toContain(renderer.projectionCleanupError);
  expect(leaves).toContain(renderer.inputCleanupError);
  expect(leaves).toContain(renderer.rendererCleanupError);
  expect(renderer.disposed).toBeTrue();

  await host.dispose();
});

test('Composition diagnostics expose the complete reverse Child cleanup order', async () => {
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
  const composition = host.install(
    createBasicCanvasPlugin((_config: Readonly<{ readonly targetId: string }>) => new TestCanvasRenderer()),
    { targetId: 'cleanup-order' },
  );
  await composition.whenActive();
  events.length = 0;

  await composition.dispose();

  expect(
    events
      .filter(
        (event) => event.name === 'cflow.runtime.activation.ended' && event.scope.pluginName !== '@cflow/preset-basic',
      )
      .map((event) => event.scope.pluginName),
  ).toEqual([
    '@cflow/plugin-history',
    '@cflow/plugin-interaction',
    '@cflow/plugin-renderer',
    '@cflow/plugin-session',
    '@cflow/plugin-command',
    '@cflow/plugin-kernel',
  ]);

  await host.dispose();
});

class DeferredDisposalRenderer extends TestCanvasRenderer {
  readonly disposeStarted: Promise<void>;
  #startDisposal!: () => void;
  #finishDisposal!: () => void;
  readonly #disposalFinished: Promise<void>;

  constructor() {
    super();
    this.disposeStarted = new Promise<void>((resolve) => {
      this.#startDisposal = resolve;
    });
    this.#disposalFinished = new Promise<void>((resolve) => {
      this.#finishDisposal = resolve;
    });
  }

  finishDisposal(): void {
    this.#finishDisposal();
  }

  override async dispose(): Promise<void> {
    this.#startDisposal();
    await this.#disposalFinished;
    await super.dispose();
  }
}

class FailingCleanupRenderer extends TestCanvasRenderer {
  readonly projectionCleanupError = new Error('interaction projection cleanup failed');
  readonly inputCleanupError = new Error('renderer input cleanup failed');
  readonly rendererCleanupError = new Error('renderer dispose failed');

  override updateInteraction(projection: InteractionProjection | null): void {
    if (projection === null) throw this.projectionCleanupError;
  }

  override subscribeInput(_listener: RendererInputListener): () => void {
    return () => {
      throw this.inputCleanupError;
    };
  }

  override async dispose(): Promise<void> {
    this.disposed = true;
    throw this.rendererCleanupError;
  }
}

function collectAggregateLeaves(error: unknown): unknown[] {
  if (!(error instanceof AggregateError)) return [error];
  return error.errors.flatMap(collectAggregateLeaves);
}

function createOccupiedRendererService(): RendererService {
  return Object.freeze({
    bindInteractionProjection() {
      return Object.freeze({ update() {}, dispose() {} });
    },
    subscribeInput() {
      return () => undefined;
    },
    hitTest() {
      return null;
    },
    capturePointer() {},
    releasePointer() {},
    focus() {},
  });
}
