import { describe, expect, test } from 'bun:test';

import {
  createPluginHost,
  definePlugin,
  defineService,
  type InstallationSnapshot,
  type Plugin,
  type PluginDefinition,
  type PluginInstallation,
  PluginHostError,
  type ServiceToken,
} from '../src';

describe('@nodebraid/runtime-cordis', () => {
  test('keeps Service Token identity separate from its diagnostic name', () => {
    const first = defineService<{ value: string }>('catalog');
    const second = defineService<{ value: string }>('catalog');

    expect(first.name).toBe('catalog');
    expect(second.name).toBe('catalog');
    expect(first).not.toBe(second);
  });

  test('keeps Plugin Service Bindings fixed after definition', () => {
    const input = defineService<{ read(): string }>('input');
    const replacement = defineService<{ read(): string }>('replacement');
    const output = defineService<{ value: string }>('output');
    const requires = { input };
    const provides = { output };
    const plugin = definePlugin({
      requires,
      provides,
      setup(context) {
        return { output: { value: context.services.input.read() } };
      },
    });

    requires.input = replacement;

    expect(plugin.requires).toEqual({ input });
    expect(plugin.provides).toEqual({ output });
    expect(Object.isFrozen(plugin.requires)).toBe(true);
    expect(Object.isFrozen(plugin.provides)).toBe(true);
  });

  test('keeps a Consumer pending until every Required Service is active', async () => {
    const catalog = defineService<{ read(): string }>('catalog');
    let setupStarted = false;
    const consumer = definePlugin({
      requires: { catalog },
      setup() {
        setupStarted = true;
      },
    });
    const host = createPluginHost();

    const installation = host.install(consumer);
    await Promise.resolve();

    expect(installation.getSnapshot()).toEqual({
      status: 'pending',
      missing: [catalog],
    });
    expect(setupStarted).toBe(false);

    await host.dispose();
  });

  test('activates a Consumer-first installation with its declared Service Binding', async () => {
    const catalog = defineService<{ read(): string }>('catalog');
    const receivedValues: string[] = [];
    const consumer = definePlugin({
      requires: { catalog },
      setup(context) {
        receivedValues.push(context.services.catalog.read());
      },
    });
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return { catalog: { read: () => 'from-provider' } };
      },
    });
    const host = createPluginHost();

    const consumerInstallation = host.install(consumer);
    const providerInstallation = host.install(provider);
    await providerInstallation.whenActive();
    await consumerInstallation.whenActive();

    expect(receivedValues).toEqual(['from-provider']);
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('fails a Provider that omits a declared Service without publishing partial results', async () => {
    const first = defineService<{ value: string }>('first');
    const second = defineService<{ value: string }>('second');
    let consumerSetupStarted = false;
    const consumer = definePlugin({
      requires: { first },
      setup() {
        consumerSetupStarted = true;
      },
    });
    const provider = definePlugin({
      provides: { first, second },
      // @ts-expect-error The runtime contract must reject JavaScript callers too.
      setup() {
        return { first: { value: 'partial' } };
      },
    });
    const host = createPluginHost();
    const consumerInstallation = host.install(consumer);

    const providerInstallation = host.install(provider);
    const activationError = await providerInstallation.whenActive().catch((error: unknown) => error);

    expect(activationError).toMatchObject({ code: 'CONTRACT_VIOLATION' });
    expect(providerInstallation.getSnapshot()).toEqual({
      status: 'failed',
      error: activationError,
    });
    expect(consumerSetupStarted).toBe(false);
    expect(consumerInstallation.getSnapshot()).toEqual({
      status: 'pending',
      missing: [first],
    });

    await host.dispose();
  });

  test('publishes every Provided Service together after setup completes', async () => {
    const first = defineService<{ readonly value: string }>('first');
    const second = defineService<{ readonly value: string }>('second');
    const observedValues: Array<readonly [string, string]> = [];
    let finishProviderSetup: (() => void) | undefined;
    let markProviderSetupStarted: (() => void) | undefined;
    const providerSetupStarted = new Promise<void>((resolve) => {
      markProviderSetupStarted = resolve;
    });
    const consumer = definePlugin({
      requires: { first, second },
      setup(context) {
        observedValues.push([context.services.first.value, context.services.second.value]);
      },
    });
    const provider = definePlugin({
      provides: { first, second },
      async setup() {
        markProviderSetupStarted?.();
        await new Promise<void>((resolve) => {
          finishProviderSetup = resolve;
        });
        return {
          first: { value: 'first-ready' },
          second: { value: 'second-ready' },
        };
      },
    });
    const host = createPluginHost();
    const consumerInstallation = host.install(consumer);
    const providerInstallation = host.install(provider);
    await providerSetupStarted;

    expect(observedValues).toEqual([]);
    expect(consumerInstallation.getSnapshot()).toEqual({
      status: 'pending',
      missing: [first, second],
    });

    finishProviderSetup?.();
    await Promise.all([providerInstallation.whenActive(), consumerInstallation.whenActive()]);

    expect(observedValues).toEqual([['first-ready', 'second-ready']]);
    await host.dispose();
  });

  test('publishes every Provided Service before any one Service can activate a Consumer', async () => {
    const first = defineService<{ readonly value: string }>('first');
    const second = defineService<{ readonly value: string }>('second');
    let childInitialSnapshot: InstallationSnapshot | undefined;
    const secondConsumer = definePlugin({
      requires: { second },
      setup() {},
    });
    const firstConsumer = definePlugin({
      requires: { first },
      async setup(context) {
        const child = context.install(secondConsumer);
        childInitialSnapshot = child.getSnapshot();
        await child.whenActive();
      },
    });
    const provider = definePlugin({
      provides: { first, second },
      setup() {
        return {
          first: { value: 'first-ready' },
          second: { value: 'second-ready' },
        };
      },
    });
    const host = createPluginHost();
    const consumerInstallation = host.install(firstConsumer);
    const providerInstallation = host.install(provider);

    await Promise.all([providerInstallation.whenActive(), consumerInstallation.whenActive()]);

    expect(childInitialSnapshot).toEqual({ status: 'pending', missing: [] });
    await host.dispose();
  });

  test('materializes each Provided Service getter exactly once before publication', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const service = { value: 'stable' };
    let getterReads = 0;
    let receivedService: { readonly value: string } | undefined;
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return {
          get catalog() {
            getterReads += 1;
            return getterReads === 1 ? service : undefined;
          },
        } as { catalog: { readonly value: string } };
      },
    });
    const consumer = definePlugin({
      requires: { catalog },
      setup(context) {
        receivedService = context.services.catalog;
      },
    });
    const host = createPluginHost();
    const consumerInstallation = host.install(consumer);
    const providerInstallation = host.install(provider);

    await providerInstallation.whenActive();

    expect(getterReads).toBe(1);
    await consumerInstallation.whenActive();
    expect(receivedService).toBe(service);
    expect(providerInstallation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('preserves a Provided Service getter error as the Activation failure', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const getterError = new Error('cannot read Provided Service');
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return {
          get catalog(): { readonly value: string } {
            throw getterError;
          },
        };
      },
    });
    const host = createPluginHost();
    const installation = host.install(provider);

    await expect(installation.whenActive()).rejects.toBe(getterError);
    expect(installation.getSnapshot()).toEqual({ status: 'failed', error: getterError });

    await host.dispose();
  });

  test('rejects non-record Provided Service results with a stable contract error', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const providers = [42, 'invalid'] as const;

    for (const result of providers) {
      const provider = definePlugin({
        provides: { catalog },
        setup() {
          return result as unknown as { catalog: { readonly value: string } };
        },
      });
      const host = createPluginHost();
      const installation = host.install(provider);

      const error = await installation.whenActive().catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(PluginHostError);
      expect(error).toMatchObject({ code: 'CONTRACT_VIOLATION' });
      expect(installation.getSnapshot()).toEqual({ status: 'failed', error });
      await host.dispose();
    }

    const host = createPluginHost();
    const installation = host.install(
      definePlugin({
        setup() {
          return 'unexpected' as unknown as void;
        },
      }),
    );
    const error = await installation.whenActive().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(PluginHostError);
    expect(error).toMatchObject({ code: 'CONTRACT_VIOLATION' });
    expect(installation.getSnapshot()).toEqual({ status: 'failed', error });
    await host.dispose();
  });

  test('fails a Provider that returns an undeclared Service Binding', async () => {
    const catalog = defineService<{ value: string }>('catalog');
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return {
          catalog: { value: 'declared' },
          undeclared: { value: 'extra' },
        };
      },
    });
    const host = createPluginHost();

    const installation = host.install(provider);
    const activationError = await installation.whenActive().catch((error: unknown) => error);

    expect(activationError).toMatchObject({ code: 'CONTRACT_VIOLATION' });
    expect(installation.getSnapshot()).toEqual({ status: 'failed', error: activationError });

    await host.dispose();
  });

  for (const [label, value] of [
    ['null', null],
    ['undefined', undefined],
  ] as const) {
    test(`fails a Provider that returns ${label} for a Provided Service`, async () => {
      const catalog = defineService<{ value: string }>('catalog');
      const provider = definePlugin({
        provides: { catalog },
        setup() {
          return { catalog: value } as unknown as { catalog: { value: string } };
        },
      });
      const host = createPluginHost();

      const installation = host.install(provider);
      const activationError = await installation.whenActive().catch((error: unknown) => error);

      expect(activationError).toMatchObject({ code: 'CONTRACT_VIOLATION' });
      expect(installation.getSnapshot()).toEqual({ status: 'failed', error: activationError });

      await host.dispose();
    });
  }

  test('fails a Provider that returns the same Service Token through duplicate bindings', async () => {
    const catalog = defineService<{ value: string }>('catalog');
    const provider = definePlugin({
      provides: { primary: catalog, duplicate: catalog },
      setup() {
        return {
          primary: { value: 'primary' },
          duplicate: { value: 'duplicate' },
        };
      },
    });
    const host = createPluginHost();

    const installation = host.install(provider);
    const activationError = await installation.whenActive().catch((error: unknown) => error);

    expect(activationError).toMatchObject({ code: 'CONTRACT_VIOLATION' });
    expect(installation.getSnapshot()).toEqual({ status: 'failed', error: activationError });

    await host.dispose();
  });

  test('reserves a Provided Service Token from installation until disposal', async () => {
    const catalog = defineService<{ value: string }>('catalog');
    const firstProvider = definePlugin({
      name: 'first-provider',
      provides: { catalog },
      setup() {
        return { catalog: { value: 'first' } };
      },
    });
    const replacementProvider = definePlugin({
      name: 'replacement-provider',
      provides: { catalog },
      setup() {
        return { catalog: { value: 'replacement' } };
      },
    });
    const host = createPluginHost();

    const firstInstallation = host.install(firstProvider);

    let pendingConflict: PluginHostError | undefined;
    try {
      host.install(replacementProvider);
    } catch (error) {
      if (error instanceof PluginHostError) pendingConflict = error;
    }

    expect(pendingConflict).toMatchObject({
      code: 'PROVIDER_CONFLICT',
      details: {
        type: 'provider-conflict',
        serviceName: 'catalog',
        existingProvider: 'first-provider',
        conflictingProvider: 'replacement-provider',
      },
    });
    const pendingDetails = pendingConflict?.details;
    expect(pendingDetails?.type).toBe('provider-conflict');
    if (pendingDetails?.type !== 'provider-conflict') throw new Error('Expected provider conflict details.');
    expect(pendingDetails.serviceName).toBe('catalog');

    await firstInstallation.whenActive();
    expect(() => host.install(replacementProvider)).toThrow(expect.objectContaining({ code: 'PROVIDER_CONFLICT' }));

    await firstInstallation.dispose();

    const replacementInstallation = host.install(replacementProvider);
    await replacementInstallation.whenActive();
    expect(replacementInstallation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('retains a failed Provider reservation until disposal', async () => {
    const catalog = defineService<{ value: string }>('catalog');
    const setupError = new Error('provider setup failed');
    const failingProvider = definePlugin({
      name: 'failing-provider',
      provides: { catalog },
      setup(): { catalog: { value: string } } {
        throw setupError;
      },
    });
    const replacementProvider = definePlugin({
      name: 'replacement-provider',
      provides: { catalog },
      setup() {
        return { catalog: { value: 'replacement' } };
      },
    });
    const host = createPluginHost();
    const failingInstallation = host.install(failingProvider);
    await expect(failingInstallation.whenActive()).rejects.toBe(setupError);

    expect(() => host.install(replacementProvider)).toThrow(expect.objectContaining({ code: 'PROVIDER_CONFLICT' }));

    await failingInstallation.dispose();
    const replacementInstallation = host.install(replacementProvider);
    await replacementInstallation.whenActive();
    expect(replacementInstallation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('does not retain any reservation from a rejected multi-Service Provider', async () => {
    const reserved = defineService<{ value: string }>('reserved');
    const available = defineService<{ value: string }>('available');
    const existingProvider = definePlugin({
      provides: { reserved },
      setup() {
        return { reserved: { value: 'existing' } };
      },
    });
    const conflictingProvider = definePlugin({
      provides: { reserved, available },
      setup() {
        return {
          reserved: { value: 'conflicting' },
          available: { value: 'must-not-be-reserved' },
        };
      },
    });
    const availableProvider = definePlugin({
      provides: { available },
      setup() {
        return { available: { value: 'available' } };
      },
    });
    const host = createPluginHost();
    host.install(existingProvider);

    expect(() => host.install(conflictingProvider)).toThrow(expect.objectContaining({ code: 'PROVIDER_CONFLICT' }));

    const availableInstallation = host.install(availableProvider);
    await availableInstallation.whenActive();
    expect(availableInstallation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('activates a Provider-first Consumer with no missing Service Tokens', async () => {
    const catalog = defineService<{ read(): string }>('catalog');
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return { catalog: { read: () => 'provider-first' } };
      },
    });
    const receivedValues: string[] = [];
    const consumer = definePlugin({
      requires: { catalog },
      setup(context) {
        receivedValues.push(context.services.catalog.read());
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    await providerInstallation.whenActive();

    const consumerInstallation = host.install(consumer);
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'pending', missing: [] });
    await consumerInstallation.whenActive();

    expect(receivedValues).toEqual(['provider-first']);
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('deactivates a Consumer before cleaning up a disappearing Provider', async () => {
    const catalog = defineService<{ read(): string }>('catalog');
    const cleanupOrder: string[] = [];
    let consumerSignal: AbortSignal | undefined;
    const provider = definePlugin({
      provides: { catalog },
      setup(context) {
        context.own(() => {
          cleanupOrder.push('provider');
        });
        return { catalog: { read: () => 'available' } };
      },
    });
    const consumer = definePlugin({
      requires: { catalog },
      setup(context) {
        consumerSignal = context.signal;
        context.own(() => {
          cleanupOrder.push('consumer');
        });
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    const consumerInstallation = host.install(consumer);
    await Promise.all([providerInstallation.whenActive(), consumerInstallation.whenActive()]);

    await providerInstallation.dispose();

    expect(consumerSignal?.aborted).toBe(true);
    expect(cleanupOrder).toEqual(['consumer', 'provider']);
    expect(consumerInstallation.getSnapshot()).toEqual({
      status: 'pending',
      missing: [catalog],
    });

    await host.dispose();
  });

  test('reports a dependency-driven Consumer as pending while its cleanup is still running', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    let consumerSignal: AbortSignal | undefined;
    let finishCleanup: (() => void) | undefined;
    let markCleanupStarted: (() => void) | undefined;
    const cleanupStarted = new Promise<void>((resolve) => {
      markCleanupStarted = resolve;
    });
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return { catalog: { value: 'available' } };
      },
    });
    const consumer = definePlugin({
      requires: { catalog },
      setup(context) {
        consumerSignal = context.signal;
        context.own(async () => {
          markCleanupStarted?.();
          await new Promise<void>((resolve) => {
            finishCleanup = resolve;
          });
        });
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    const consumerInstallation = host.install(consumer);
    await Promise.all([providerInstallation.whenActive(), consumerInstallation.whenActive()]);

    const providerDisposal = providerInstallation.dispose();
    await cleanupStarted;
    const pendingSnapshot = consumerInstallation.getSnapshot();
    const waiterController = new AbortController();
    const abortReason = new Error('stop waiting for replacement');
    let waiterSettled = false;
    const nextActivation = consumerInstallation.whenActive(waiterController.signal).then(
      () => {
        waiterSettled = true;
      },
      (error: unknown) => {
        waiterSettled = true;
        return error;
      },
    );
    await Promise.resolve();

    expect(consumerSignal?.aborted).toBe(true);
    expect(pendingSnapshot).toEqual({ status: 'pending', missing: [catalog] });
    expect(consumerInstallation.getSnapshot()).toBe(pendingSnapshot);
    expect(waiterSettled).toBe(false);

    finishCleanup?.();
    await providerDisposal;
    expect(consumerInstallation.getSnapshot()).toBe(pendingSnapshot);

    waiterController.abort(abortReason);
    expect(await nextActivation).toBe(abortReason);
    await host.dispose();
  });

  test('deactivates indirect Consumers in reverse dependency order', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const selection = defineService<{ readonly value: string }>('selection');
    const cleanupOrder: string[] = [];
    const provider = definePlugin({
      provides: { catalog },
      setup(context) {
        context.own(() => {
          cleanupOrder.push('provider');
        });
        return { catalog: { value: 'catalog' } };
      },
    });
    const directConsumer = definePlugin({
      requires: { catalog },
      provides: { selection },
      setup(context) {
        context.own(() => {
          cleanupOrder.push('direct-consumer');
        });
        return { selection: { value: context.services.catalog.value } };
      },
    });
    const indirectConsumer = definePlugin({
      requires: { selection },
      setup(context) {
        context.own(() => {
          cleanupOrder.push('indirect-consumer');
        });
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    const directInstallation = host.install(directConsumer);
    const indirectInstallation = host.install(indirectConsumer);
    await Promise.all([
      providerInstallation.whenActive(),
      directInstallation.whenActive(),
      indirectInstallation.whenActive(),
    ]);

    await providerInstallation.dispose();

    expect(cleanupOrder).toEqual(['indirect-consumer', 'direct-consumer', 'provider']);
    expect(directInstallation.getSnapshot()).toEqual({ status: 'pending', missing: [catalog] });
    expect(indirectInstallation.getSnapshot()).toEqual({ status: 'pending', missing: [selection] });

    await host.dispose();
  });

  test('awaits Provided Service withdrawal sequentially in reverse registration order', async () => {
    const first = defineService<{ readonly value: string }>('first');
    const second = defineService<{ readonly value: string }>('second');
    const secondCleanupError = new Error('second consumer cleanup failed');
    const cleanupOrder: string[] = [];
    let firstStartedBeforeSecondFinished = false;
    let secondFinished = false;
    let finishSecondCleanup: (() => void) | undefined;
    let markSecondCleanupStarted: (() => void) | undefined;
    const secondCleanupStarted = new Promise<void>((resolve) => {
      markSecondCleanupStarted = resolve;
    });
    const provider = definePlugin({
      provides: { first, second },
      setup() {
        return {
          first: { value: 'first' },
          second: { value: 'second' },
        };
      },
    });
    const firstConsumer = definePlugin({
      requires: { first },
      setup(context) {
        context.own(() => {
          firstStartedBeforeSecondFinished = !secondFinished;
          cleanupOrder.push('first');
        });
      },
    });
    const secondConsumer = definePlugin({
      requires: { second },
      setup(context) {
        context.own(async () => {
          cleanupOrder.push('second-start');
          markSecondCleanupStarted?.();
          await new Promise<void>((resolve) => {
            finishSecondCleanup = resolve;
          });
          cleanupOrder.push('second-finish');
          throw secondCleanupError;
        });
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    const firstInstallation = host.install(firstConsumer);
    const secondInstallation = host.install(secondConsumer);
    await Promise.all([
      providerInstallation.whenActive(),
      firstInstallation.whenActive(),
      secondInstallation.whenActive(),
    ]);

    const providerDisposal = providerInstallation.dispose();
    await secondCleanupStarted;
    secondFinished = true;
    finishSecondCleanup?.();
    const providerDisposalError = await providerDisposal.catch((error: unknown) => error);
    const hostDisposalResult = await host.dispose().catch((error: unknown) => error);

    expect(firstStartedBeforeSecondFinished).toBe(false);
    expect(cleanupOrder).toEqual(['second-start', 'second-finish', 'first']);
    expect(providerDisposalError).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(providerDisposalError)).toEqual([secondCleanupError]);
    expect(hostDisposalResult).toBeUndefined();
  });

  test('reactivates a pending Consumer with fresh Activation state and fixed configuration', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const config = { mode: 'fixed' };
    const activations: Array<{
      readonly service: { readonly value: string };
      readonly signal: AbortSignal;
      readonly config: { mode: string };
    }> = [];
    const cleanedServices: string[] = [];
    const consumer = definePlugin<{ mode: string }, { catalog: typeof catalog }>({
      requires: { catalog },
      setup(context, receivedConfig) {
        const service = context.services.catalog;
        activations.push({ service, signal: context.signal, config: receivedConfig });
        context.own(() => {
          cleanedServices.push(service.value);
        });
      },
    });
    const createProvider = (value: string) =>
      definePlugin({
        provides: { catalog },
        setup() {
          return { catalog: { value } };
        },
      });
    const host = createPluginHost();
    const consumerInstallation = host.install(consumer, config);
    const firstProvider = host.install(createProvider('first'));
    await Promise.all([firstProvider.whenActive(), consumerInstallation.whenActive()]);
    const firstActiveSnapshot = consumerInstallation.getSnapshot();
    expect(consumerInstallation.getSnapshot()).toBe(firstActiveSnapshot);

    await firstProvider.dispose();
    const pendingSnapshot = consumerInstallation.getSnapshot();
    expect(pendingSnapshot).not.toBe(firstActiveSnapshot);
    expect(consumerInstallation.getSnapshot()).toBe(pendingSnapshot);
    const nextActivation = consumerInstallation.whenActive();
    const secondProvider = host.install(createProvider('second'));
    await Promise.all([secondProvider.whenActive(), nextActivation]);
    const secondActiveSnapshot = consumerInstallation.getSnapshot();

    expect(activations.map(({ service }) => service.value)).toEqual(['first', 'second']);
    expect(activations[0]?.service).not.toBe(activations[1]?.service);
    expect(activations[0]?.signal).not.toBe(activations[1]?.signal);
    expect(activations[0]?.signal.aborted).toBe(true);
    expect(activations[1]?.signal.aborted).toBe(false);
    expect(activations.map((activation) => activation.config)).toEqual([config, config]);
    expect(cleanedServices).toEqual(['first']);
    expect(secondActiveSnapshot).not.toBe(pendingSnapshot);
    expect(consumerInstallation.getSnapshot()).toBe(secondActiveSnapshot);

    await host.dispose();
  });

  test('cancels only one pending whenActive waiter', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    let setupCount = 0;
    const consumer = definePlugin({
      requires: { catalog },
      setup() {
        setupCount += 1;
      },
    });
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return { catalog: { value: 'ready' } };
      },
    });
    const host = createPluginHost();
    const installation = host.install(consumer);
    const controller = new AbortController();
    const cancelled = installation.whenActive(controller.signal).catch((error: unknown) => error);
    const stillWaiting = installation.whenActive();
    const abortReason = new Error('stop waiting');

    controller.abort(abortReason);

    expect(await cancelled).toBe(abortReason);
    expect(installation.getSnapshot()).toEqual({ status: 'pending', missing: [catalog] });

    const providerInstallation = host.install(provider);
    await Promise.all([providerInstallation.whenActive(), stillWaiting]);
    expect(setupCount).toBe(1);
    expect(installation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('settles whenActive immediately for active and rejects it for disposed', async () => {
    const plugin = definePlugin({ setup() {} });
    const host = createPluginHost();
    const installation = host.install(plugin);
    await installation.whenActive();

    await expect(installation.whenActive()).resolves.toBeUndefined();

    await installation.dispose();
    await expect(installation.whenActive()).rejects.toMatchObject({ code: 'INSTALLATION_DISPOSED' });

    await host.dispose();
  });

  test('aborts an in-progress Consumer setup and waits for it when its Required Service disappears', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    let setupSignal: AbortSignal | undefined;
    let finishSetup: (() => void) | undefined;
    let markSetupStarted: (() => void) | undefined;
    const setupStarted = new Promise<void>((resolve) => {
      markSetupStarted = resolve;
    });
    const cleanup: string[] = [];
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return { catalog: { value: 'available' } };
      },
    });
    const consumer = definePlugin({
      requires: { catalog },
      async setup(context) {
        setupSignal = context.signal;
        context.own(() => {
          cleanup.push('consumer');
        });
        markSetupStarted?.();
        await new Promise<void>((resolve) => {
          finishSetup = resolve;
        });
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    await providerInstallation.whenActive();
    const consumerInstallation = host.install(consumer);
    await setupStarted;

    const providerDisposal = providerInstallation.dispose();
    let disposalFinished = false;
    void providerDisposal.then(() => {
      disposalFinished = true;
    });
    await Promise.resolve();

    expect(setupSignal?.aborted).toBe(true);
    expect(disposalFinished).toBe(false);
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'pending', missing: [] });

    finishSetup?.();
    await providerDisposal;

    expect(cleanup).toEqual(['consumer']);
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'pending', missing: [catalog] });

    await host.dispose();
  });

  test('keeps a business setup error terminal when dependency cancellation races with it', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const businessError = new Error('business setup failed after abort');
    let setupCount = 0;
    let setupSignal: AbortSignal | undefined;
    let rejectSetup: ((error: unknown) => void) | undefined;
    let markSetupStarted: (() => void) | undefined;
    const setupStarted = new Promise<void>((resolve) => {
      markSetupStarted = resolve;
    });
    const createProvider = (value: string) =>
      definePlugin({
        provides: { catalog },
        setup() {
          return { catalog: { value } };
        },
      });
    const consumer = definePlugin({
      requires: { catalog },
      async setup(context) {
        setupCount += 1;
        setupSignal = context.signal;
        markSetupStarted?.();
        await new Promise<void>((_resolve, reject) => {
          rejectSetup = reject;
        });
      },
    });
    const host = createPluginHost();
    const consumerInstallation = host.install(consumer);
    const existingWaiter = consumerInstallation.whenActive().catch((error: unknown) => error);
    const firstProvider = host.install(createProvider('first'));
    await firstProvider.whenActive();
    await setupStarted;

    const providerDisposal = firstProvider.dispose();
    await Promise.resolve();
    expect(setupSignal?.aborted).toBe(true);
    rejectSetup?.(businessError);
    await providerDisposal;

    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'failed', error: businessError });
    expect(await existingWaiter).toBe(businessError);
    await expect(consumerInstallation.whenActive()).rejects.toBe(businessError);

    const replacementProvider = host.install(createProvider('replacement'));
    await replacementProvider.whenActive();
    await Promise.resolve();
    expect(setupCount).toBe(1);
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'failed', error: businessError });

    await host.dispose();
  });

  test('fails an aborting Consumer when dependency cleanup fails without duplicating the error', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const cleanupError = new Error('consumer cleanup failed while aborting');
    let markSetupStarted: (() => void) | undefined;
    const setupStarted = new Promise<void>((resolve) => {
      markSetupStarted = resolve;
    });
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return { catalog: { value: 'available' } };
      },
    });
    const consumer = definePlugin({
      requires: { catalog },
      async setup(context) {
        context.own(() => {
          throw cleanupError;
        });
        markSetupStarted?.();
        await new Promise<void>((_resolve, reject) => {
          context.signal.addEventListener('abort', () => reject(context.signal.reason), { once: true });
        });
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    await providerInstallation.whenActive();
    const consumerInstallation = host.install(consumer);
    const existingWaiter = consumerInstallation.whenActive().catch((error: unknown) => error);
    await setupStarted;

    const providerDisposalError = await providerInstallation.dispose().catch((error: unknown) => error);

    expect(providerDisposalError).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(providerDisposalError)).toEqual([cleanupError]);
    const failedSnapshot = consumerInstallation.getSnapshot();
    expect(failedSnapshot.status).toBe('failed');
    if (failedSnapshot.status !== 'failed') throw new Error('Expected failed Consumer Installation.');
    expect(failedSnapshot.error).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(failedSnapshot.error)).toEqual([cleanupError]);
    expect(await existingWaiter).toBe(failedSnapshot.error);
    await expect(consumerInstallation.whenActive()).rejects.toBe(failedSnapshot.error);
    await expect(consumerInstallation.dispose()).resolves.toBeUndefined();
    await expect(host.dispose()).resolves.toBeUndefined();
  });

  test('propagates an active Consumer cleanup failure to its disappearing Provider once', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const cleanupError = new Error('active consumer cleanup failed');
    let pendingWaiter: Promise<unknown> | undefined;
    const provider = definePlugin({
      provides: { catalog },
      setup() {
        return { catalog: { value: 'available' } };
      },
    });
    const consumer = definePlugin({
      requires: { catalog },
      setup(context) {
        context.own(() => {
          throw cleanupError;
        });
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(provider);
    const consumerInstallation = host.install(consumer);
    consumerInstallation.subscribe(() => {
      if (consumerInstallation.getSnapshot().status === 'pending') {
        pendingWaiter = consumerInstallation.whenActive().catch((error: unknown) => error);
      }
    });
    await Promise.all([providerInstallation.whenActive(), consumerInstallation.whenActive()]);

    const providerDisposalError = await providerInstallation.dispose().catch((error: unknown) => error);

    expect(providerDisposalError).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(providerDisposalError)).toEqual([cleanupError]);
    const failedSnapshot = consumerInstallation.getSnapshot();
    expect(failedSnapshot.status).toBe('failed');
    if (failedSnapshot.status !== 'failed') throw new Error('Expected failed Consumer Installation.');
    expect(failedSnapshot.error).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(failedSnapshot.error)).toEqual([cleanupError]);
    expect(await pendingWaiter).toBe(failedSnapshot.error);
    await expect(consumerInstallation.whenActive()).rejects.toBe(failedSnapshot.error);
    await expect(consumerInstallation.dispose()).resolves.toBeUndefined();
    await expect(host.dispose()).resolves.toBeUndefined();
  });

  test('keeps a failed Consumer terminal across unrelated Service availability changes', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const setupError = new Error('consumer setup failed');
    let setupCount = 0;
    const consumer = definePlugin({
      requires: { catalog },
      setup() {
        setupCount += 1;
        throw setupError;
      },
    });
    const createProvider = (value: string) =>
      definePlugin({
        provides: { catalog },
        setup() {
          return { catalog: { value } };
        },
      });
    const host = createPluginHost();
    const consumerInstallation = host.install(consumer);
    const firstProvider = host.install(createProvider('first'));

    await expect(consumerInstallation.whenActive()).rejects.toBe(setupError);
    const failedSnapshot = consumerInstallation.getSnapshot();
    await firstProvider.dispose();
    const secondProvider = host.install(createProvider('second'));
    await secondProvider.whenActive();
    await Promise.resolve();

    expect(setupCount).toBe(1);
    expect(consumerInstallation.getSnapshot()).toBe(failedSnapshot);
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'failed', error: setupError });
    await expect(consumerInstallation.whenActive()).rejects.toBe(setupError);

    await host.dispose();
  });

  test('allows independent Plugin Installations to activate concurrently', async () => {
    const setupStarted: string[] = [];
    let markBothStarted: (() => void) | undefined;
    const bothStarted = new Promise<void>((resolve) => {
      markBothStarted = resolve;
    });
    const finishSetup = new Map<string, () => void>();
    const plugin = definePlugin<{ id: string }>({
      async setup(_context, config) {
        setupStarted.push(config.id);
        if (setupStarted.length === 2) markBothStarted?.();
        await new Promise<void>((resolve) => {
          finishSetup.set(config.id, resolve);
        });
      },
    });
    const host = createPluginHost();
    const first = host.install(plugin, { id: 'first' });
    const second = host.install(plugin, { id: 'second' });

    await bothStarted;

    expect(setupStarted).toEqual(['first', 'second']);
    expect(first.getSnapshot()).toEqual({ status: 'pending', missing: [] });
    expect(second.getSnapshot()).toEqual({ status: 'pending', missing: [] });

    finishSetup.get('first')?.();
    finishSetup.get('second')?.();
    await Promise.all([first.whenActive(), second.whenActive()]);

    await host.dispose();
  });

  test('serializes setup and cleanup within one Plugin Installation', async () => {
    const events: string[] = [];
    let setupSignal: AbortSignal | undefined;
    let finishSetup: (() => void) | undefined;
    let markSetupStarted: (() => void) | undefined;
    const setupStarted = new Promise<void>((resolve) => {
      markSetupStarted = resolve;
    });
    const plugin = definePlugin({
      async setup(context) {
        setupSignal = context.signal;
        events.push('setup-started');
        context.own(() => {
          events.push('cleanup');
        });
        markSetupStarted?.();
        await new Promise<void>((resolve) => {
          finishSetup = resolve;
        });
        events.push('setup-finished');
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);
    await setupStarted;

    const disposal = installation.dispose();
    await Promise.resolve();

    expect(setupSignal?.aborted).toBe(true);
    expect(events).toEqual(['setup-started']);

    finishSetup?.();
    await disposal;

    expect(events).toEqual(['setup-started', 'setup-finished', 'cleanup']);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });

    await host.dispose();
  });

  test('rejects a dependency cycle with the complete Plugin and Service path', async () => {
    const firstService = defineService<{ value: string }>('first-service');
    const secondService = defineService<{ value: string }>('second-service');
    const firstPlugin = definePlugin({
      name: 'first-plugin',
      requires: { second: secondService },
      provides: { first: firstService },
      setup() {
        return { first: { value: 'first' } };
      },
    });
    const cyclicPlugin = definePlugin({
      name: 'cyclic-plugin',
      requires: { first: firstService },
      provides: { second: secondService },
      setup() {
        return { second: { value: 'cyclic' } };
      },
    });
    const validSecondProvider = definePlugin({
      name: 'valid-second-provider',
      provides: { second: secondService },
      setup() {
        return { second: { value: 'valid' } };
      },
    });
    const host = createPluginHost();
    const firstInstallation = host.install(firstPlugin);

    let cycleError: PluginHostError | undefined;
    try {
      host.install(cyclicPlugin);
    } catch (error) {
      if (error instanceof PluginHostError) cycleError = error;
    }

    expect(cycleError).toMatchObject({
      code: 'DEPENDENCY_CYCLE',
      message:
        'Plugin dependency cycle: "first-plugin" --[second-service]--> "cyclic-plugin" --[first-service]--> "first-plugin".',
      details: {
        path: [
          { plugin: 'first-plugin', serviceName: 'second-service', provider: 'cyclic-plugin' },
          { plugin: 'cyclic-plugin', serviceName: 'first-service', provider: 'first-plugin' },
        ],
      },
    });
    const cycleDetails = cycleError?.details;
    expect(cycleDetails?.type).toBe('dependency-cycle');
    if (cycleDetails?.type !== 'dependency-cycle') throw new Error('Expected dependency cycle details.');
    expect(cycleDetails.path[0]?.serviceName).toBe('second-service');
    expect(cycleDetails.path[1]?.serviceName).toBe('first-service');
    expect(firstInstallation.getSnapshot()).toEqual({
      status: 'pending',
      missing: [secondService],
    });

    const secondInstallation = host.install(validSecondProvider);
    await Promise.all([firstInstallation.whenActive(), secondInstallation.whenActive()]);
    expect(firstInstallation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('rejects a Plugin definition that requires and provides the same Service Token', () => {
    const catalog = defineService<{ value: string }>('catalog');

    expect(() =>
      definePlugin({
        name: 'self-dependent',
        requires: { input: catalog },
        provides: { output: catalog },
        setup() {
          return { output: { value: 'invalid' } };
        },
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_DEFINITION' }));
  });

  test('rejects forged Plugin and Service Token values as invalid definitions', () => {
    const forgedPlugin = {
      name: 'forged-plugin',
      requires: {},
      provides: {},
    } as unknown as Plugin;
    const forgedToken = Object.freeze({
      name: 'forged-service',
    }) as unknown as ServiceToken<{ readonly value: string }>;
    const host = createPluginHost();

    expect(() => host.install(forgedPlugin)).toThrow(expect.objectContaining({ code: 'INVALID_DEFINITION' }));
    expect(() =>
      definePlugin({
        requires: { forged: forgedToken },
        setup() {},
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_DEFINITION' }));
    expect(() =>
      definePlugin({
        provides: { forged: forgedToken },
        setup() {
          return { forged: { value: 'forged' } };
        },
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_DEFINITION' }));
  });

  test('rejects malformed Plugin definitions before creating Plugin metadata', () => {
    const getterError = new Error('cannot read Plugin setup');
    const throwingDefinition = Object.defineProperty({}, 'setup', {
      get() {
        throw getterError;
      },
    });

    expect(() => definePlugin(null as unknown as PluginDefinition)).toThrow(
      expect.objectContaining({ code: 'INVALID_DEFINITION' }),
    );
    expect(() => definePlugin({ setup: null } as unknown as PluginDefinition)).toThrow(
      expect.objectContaining({ code: 'INVALID_DEFINITION' }),
    );
    expect(() => definePlugin({ name: 42, setup() {} } as unknown as PluginDefinition)).toThrow(
      expect.objectContaining({ code: 'INVALID_DEFINITION' }),
    );
    expect(() => definePlugin(throwingDefinition as PluginDefinition)).toThrow(getterError);
  });

  test('accepts only plain enumerable string-key Service Binding records', () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const symbolBindings = { [Symbol('catalog')]: catalog };
    const nonEnumerableBindings = Object.create(null) as Record<string, typeof catalog>;
    Object.defineProperty(nonEnumerableBindings, 'catalog', {
      enumerable: false,
      value: catalog,
    });
    const malformedDefinitions = [
      { requires: null, setup() {} },
      { provides: 42, setup() {} },
      { requires: [catalog], setup() {} },
      { requires: symbolBindings, setup() {} },
      { requires: nonEnumerableBindings, setup() {} },
    ];

    for (const definition of malformedDefinitions) {
      expect(() => definePlugin(definition as unknown as PluginDefinition)).toThrow(
        expect.objectContaining({ code: 'INVALID_DEFINITION' }),
      );
    }

    let bindingReads = 0;
    const nullPrototypeBindings = Object.create(null) as { catalog: typeof catalog };
    Object.defineProperty(nullPrototypeBindings, 'catalog', {
      enumerable: true,
      get() {
        bindingReads += 1;
        return catalog;
      },
    });
    const plugin = definePlugin<void, { catalog: typeof catalog }, {}>({
      requires: nullPrototypeBindings,
      provides: undefined,
      setup() {},
    });
    const emptyPlugin = definePlugin<void, {}, {}>({ requires: undefined, provides: undefined, setup() {} });

    expect(plugin.requires.catalog).toBe(catalog);
    expect(bindingReads).toBe(1);
    expect(emptyPlugin.requires).toEqual({});
    expect(emptyPlugin.provides).toEqual({});
  });

  test('captures every Plugin definition field exactly once before validation', async () => {
    const input = defineService<{ readonly value: string }>('input');
    const output = defineService<{ readonly value: string }>('output');
    const reads = { name: 0, setup: 0, requires: 0, provides: 0 };
    const readOnce = <Key extends keyof typeof reads, Value>(key: Key, value: Value): Value => {
      reads[key] += 1;
      if (reads[key] > 1) throw new Error(`Plugin definition ${key} was read twice.`);
      return value;
    };
    const definition = Object.defineProperties(
      {},
      {
        name: {
          enumerable: true,
          get: () => readOnce('name', 'getter-plugin'),
        },
        setup: {
          enumerable: true,
          get: () =>
            readOnce('setup', (context: { services: { input: { value: string } } }) => ({
              output: { value: context.services.input.value },
            })),
        },
        requires: {
          enumerable: true,
          get: () => readOnce('requires', { input }),
        },
        provides: {
          enumerable: true,
          get: () => readOnce('provides', { output }),
        },
      },
    ) as PluginDefinition<void, { input: typeof input }, { output: typeof output }>;

    const plugin = definePlugin(definition);

    expect(reads).toEqual({ name: 1, setup: 1, requires: 1, provides: 1 });
    expect(plugin.name).toBe('getter-plugin');

    const provider = definePlugin({
      provides: { input },
      setup() {
        return { input: { value: 'captured' } };
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);
    const providerInstallation = host.install(provider);
    await Promise.all([providerInstallation.whenActive(), installation.whenActive()]);

    expect(reads).toEqual({ name: 1, setup: 1, requires: 1, provides: 1 });
    await host.dispose();
  });

  test('infers configuration, Service Bindings, and Provided Service results', () => {
    const source = defineService<{ read(): number }>('source');
    const result = defineService<{ value: number }>('result');
    const plugin = definePlugin({
      requires: { source },
      provides: { result },
      setup(context, config: { multiplier: number }) {
        const value: number = context.services.source.read();
        // @ts-expect-error Undeclared Required Services are not available.
        void context.services.undeclared;
        return { result: { value: value * config.multiplier } };
      },
    });

    const verifyTypes = () => {
      const host = createPluginHost();
      // @ts-expect-error Configuration is required by this Plugin.
      host.install(plugin);
      // @ts-expect-error Service Binding records are readonly.
      plugin.requires.source = source;
      definePlugin({
        provides: { result },
        // @ts-expect-error Every declared Provided Service must be returned.
        setup() {
          return {};
        },
      });
      definePlugin({
        setup(context) {
          const child: PluginInstallation = context.install(plugin, { multiplier: 2 });
          // @ts-expect-error Child Plugin configuration remains required.
          context.install(plugin);
          void child;
        },
      });
    };
    void verifyTypes;

    expect(plugin.requires.source).toBe(source);
    expect(plugin.provides.result).toBe(result);
  });

  test('keeps Service Token values and Plugin configurations invariant', () => {
    interface Animal {
      readonly name: string;
    }
    interface Dog extends Animal {
      bark(): void;
    }

    const animal = defineService<Animal>('animal');
    const dog = defineService<Dog>('dog');
    const configuredPlugin = definePlugin<{ required: string }>({ setup() {} });
    const genericPlugin = definePlugin<{}>({ setup() {} });

    const verifyTypes = () => {
      // @ts-expect-error A Dog token cannot be widened and provided an arbitrary Animal.
      const widenedToken: ServiceToken<Animal> = dog;
      // @ts-expect-error An Animal token cannot be narrowed and consumed as a Dog.
      const narrowedToken: ServiceToken<Dog> = animal;
      // @ts-expect-error Required Plugin configuration cannot be widened away.
      const widenedPlugin: Plugin<{}> = configuredPlugin;
      // @ts-expect-error Generic Plugin configuration cannot be narrowed to a required shape.
      const narrowedPlugin: Plugin<{ required: string }> = genericPlugin;
      void [widenedToken, narrowedToken, widenedPlugin, narrowedPlugin];
    };
    void verifyTypes;

    expect(dog.name).toBe('dog');
    expect(configuredPlugin.requires).toEqual({});
  });

  test('returns a pending installation before activating a plugin', async () => {
    let setupStarted = false;
    const plugin = definePlugin({
      setup() {
        setupStarted = true;
      },
    });
    const host = createPluginHost();

    const installation = host.install(plugin);

    expect(setupStarted).toBe(false);
    expect(installation.getSnapshot()).toEqual({ status: 'pending', missing: [] });

    await installation.whenActive();

    expect(setupStarted).toBe(true);
    expect(installation.getSnapshot()).toEqual({ status: 'active' });
  });

  test('preserves one setup failure without affecting another installation', async () => {
    const setupError = new Error('setup failed');
    const failingPlugin = definePlugin({
      setup() {
        throw setupError;
      },
    });
    const workingPlugin = definePlugin({ setup() {} });
    const host = createPluginHost();

    const failingInstallation = host.install(failingPlugin);
    const workingInstallation = host.install(workingPlugin);

    await expect(failingInstallation.whenActive()).rejects.toBe(setupError);
    await workingInstallation.whenActive();

    expect(failingInstallation.getSnapshot()).toEqual({
      status: 'failed',
      error: setupError,
    });
    expect(workingInstallation.getSnapshot()).toEqual({ status: 'active' });
  });

  test('publishes each snapshot change to removable subscribers', async () => {
    const plugin = definePlugin({ setup() {} });
    const host = createPluginHost();
    const installation = host.install(plugin);
    const pendingSnapshot = installation.getSnapshot();
    const observedSnapshots: InstallationSnapshot[] = [];
    const unsubscribe = installation.subscribe(() => {
      observedSnapshots.push(installation.getSnapshot());
    });

    expect(installation.getSnapshot()).toBe(pendingSnapshot);

    await installation.whenActive();

    expect(observedSnapshots).toEqual([{ status: 'active' }]);
    expect(observedSnapshots[0]).not.toBe(pendingSnapshot);
    expect(installation.getSnapshot()).toBe(observedSnapshots[0]);

    unsubscribe();
    unsubscribe();
  });

  test('reports subscriber errors without interrupting lifecycle observers', async () => {
    const listenerError = new Error('subscriber failed');
    const reportedErrors: unknown[] = [];
    const earlyStatuses: string[] = [];
    const lateStatuses: string[] = [];
    let markActiveObserved: (() => void) | undefined;
    const activeObserved = new Promise<void>((resolve) => {
      markActiveObserved = resolve;
    });
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: (error: unknown) => reportedErrors.push(error),
    });

    try {
      const plugin = definePlugin({ setup() {} });
      const host = createPluginHost();
      const installation = host.install(plugin);
      const controller = new AbortController();
      const abortReason = new Error('activation waiter stayed pending');
      const activation = installation.whenActive(controller.signal).then(
        () => 'active' as const,
        (error: unknown) => error,
      );
      installation.subscribe(() => {
        const status = installation.getSnapshot().status;
        earlyStatuses.push(status);
        if (status === 'active') markActiveObserved?.();
      });
      installation.subscribe(() => {
        throw listenerError;
      });
      installation.subscribe(() => {
        lateStatuses.push(installation.getSnapshot().status);
      });

      await activeObserved;
      controller.abort(abortReason);
      const disposalResult = await host.dispose().catch((error: unknown) => error);

      expect(await activation).toBe('active');
      expect(disposalResult).toBeUndefined();
      expect(earlyStatuses).toEqual(['active', 'disposed']);
      expect(lateStatuses).toEqual(['active', 'disposed']);
      expect(reportedErrors).toEqual([listenerError, listenerError]);
    } finally {
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      } else {
        Reflect.deleteProperty(globalThis, 'reportError');
      }
    }
  });

  test('schedules subscriber errors when platform reportError is unavailable', async () => {
    const listenerError = new Error('subscriber failed without reportError');
    const queuedReports: Array<() => void> = [];
    const lateStatuses: string[] = [];
    let markActiveObserved: (() => void) | undefined;
    const activeObserved = new Promise<void>((resolve) => {
      markActiveObserved = resolve;
    });
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    const originalQueueMicrotask = Object.getOwnPropertyDescriptor(globalThis, 'queueMicrotask');
    Reflect.deleteProperty(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'queueMicrotask', {
      configurable: true,
      value: (callback: () => void) => queuedReports.push(callback),
    });

    try {
      const plugin = definePlugin({ setup() {} });
      const host = createPluginHost();
      const installation = host.install(plugin);
      const controller = new AbortController();
      const abortReason = new Error('activation waiter stayed pending');
      const activation = installation.whenActive(controller.signal).then(
        () => 'active' as const,
        (error: unknown) => error,
      );
      installation.subscribe(() => {
        if (installation.getSnapshot().status === 'active') {
          markActiveObserved?.();
        }
      });
      installation.subscribe(() => {
        throw listenerError;
      });
      installation.subscribe(() => {
        lateStatuses.push(installation.getSnapshot().status);
      });

      await activeObserved;
      await Promise.resolve();
      controller.abort(abortReason);
      const disposalResult = await host.dispose().catch((error: unknown) => error);
      const scheduledErrors = queuedReports.map((report) => {
        try {
          report();
        } catch (error) {
          return error;
        }
      });

      expect(await activation).toBe('active');
      expect(disposalResult).toBeUndefined();
      expect(lateStatuses).toEqual(['active', 'disposed']);
      expect(scheduledErrors).toEqual([listenerError, listenerError]);
    } finally {
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      }
      if (originalQueueMicrotask) {
        Object.defineProperty(globalThis, 'queueMicrotask', originalQueueMicrotask);
      }
    }
  });

  test('keeps subscriber reporting failures outside the Plugin lifecycle', async () => {
    const catalog = defineService<{ readonly value: string }>('catalog');
    const listenerError = new Error('subscriber failed');
    const reporterError = new Error('platform reporting failed');
    const queuedReports: Array<() => void> = [];
    let markActiveObserved: (() => void) | undefined;
    const activeObserved = new Promise<void>((resolve) => {
      markActiveObserved = resolve;
    });
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    const originalQueueMicrotask = Object.getOwnPropertyDescriptor(globalThis, 'queueMicrotask');
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: () => {
        throw reporterError;
      },
    });
    Object.defineProperty(globalThis, 'queueMicrotask', {
      configurable: true,
      value: (callback: () => void) => queuedReports.push(callback),
    });

    try {
      const provider = definePlugin({
        provides: { catalog },
        setup() {
          return { catalog: { value: 'available' } };
        },
      });
      let consumerSetupCount = 0;
      const consumer = definePlugin({
        requires: { catalog },
        setup() {
          consumerSetupCount += 1;
        },
      });
      const host = createPluginHost();
      const providerInstallation = host.install(provider);
      const existingWaiter = providerInstallation.whenActive();
      providerInstallation.subscribe(() => {
        if (providerInstallation.getSnapshot().status === 'active') {
          markActiveObserved?.();
        }
      });
      providerInstallation.subscribe(() => {
        throw listenerError;
      });

      await activeObserved;
      await Promise.resolve();

      expect(providerInstallation.getSnapshot()).toEqual({ status: 'active' });
      await expect(existingWaiter).resolves.toBeUndefined();
      await expect(providerInstallation.whenActive()).resolves.toBeUndefined();

      const consumerInstallation = host.install(consumer);
      await consumerInstallation.whenActive();
      expect(consumerSetupCount).toBe(1);

      await expect(host.dispose()).resolves.toBeUndefined();
      const scheduledErrors = queuedReports.map((report) => {
        try {
          report();
        } catch (error) {
          return error;
        }
      });
      expect(scheduledErrors).toHaveLength(2);
      for (const error of scheduledErrors) {
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toEqual([listenerError, reporterError]);
      }
    } finally {
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      } else {
        Reflect.deleteProperty(globalThis, 'reportError');
      }
      if (originalQueueMicrotask) {
        Object.defineProperty(globalThis, 'queueMicrotask', originalQueueMicrotask);
      }
    }
  });

  test('disposes owned resources in reverse registration order', async () => {
    const disposedResources: string[] = [];
    const plugin = definePlugin({
      setup(context) {
        context.own(() => {
          disposedResources.push('first');
        });
        context.own(async () => {
          await Promise.resolve();
          disposedResources.push('second');
        });
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);
    await installation.whenActive();

    await installation.dispose();

    expect(disposedResources).toEqual(['second', 'first']);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
  });

  test('owns a typed Child Installation at its resource registration position', async () => {
    const cleanupOrder: string[] = [];
    let childInstallation: PluginInstallation | undefined;
    const child = definePlugin<{ id: string }>({
      setup(context, config) {
        context.own(() => {
          cleanupOrder.push(config.id);
        });
      },
    });
    const composition = definePlugin({
      async setup(context) {
        context.own(() => {
          cleanupOrder.push('parent-first');
        });
        childInstallation = context.install(child, { id: 'child' });
        context.own(() => {
          cleanupOrder.push('parent-last');
        });
        await childInstallation.whenActive();
      },
    });
    const host = createPluginHost();
    const parentInstallation = host.install(composition);
    await parentInstallation.whenActive();

    await parentInstallation.dispose();

    expect(cleanupOrder).toEqual(['parent-last', 'child', 'parent-first']);
    expect(childInstallation?.getSnapshot()).toEqual({ status: 'disposed' });

    await host.dispose();
  });

  test('rejects a detached Child installation through an ended parent Activation', async () => {
    let installDetachedChild: (() => unknown) | undefined;
    let childSetupCount = 0;
    const child = definePlugin({
      setup() {
        childSetupCount += 1;
      },
    });
    const composition = definePlugin({
      setup(context) {
        installDetachedChild = () => context.install(child);
      },
    });
    const host = createPluginHost();
    const parentInstallation = host.install(composition);
    await parentInstallation.whenActive();
    await parentInstallation.dispose();

    expect(installDetachedChild).toBeDefined();
    expect(() => installDetachedChild?.()).toThrow(expect.objectContaining({ code: 'INSTALLATION_DISPOSED' }));
    await Promise.resolve();
    expect(childSetupCount).toBe(0);

    await host.dispose();
  });

  test('keeps an unawaited Child failure isolated from its parent Activation', async () => {
    const childError = new Error('optional child failed');
    let childInstallation: PluginInstallation | undefined;
    const child = definePlugin({
      setup() {
        throw childError;
      },
    });
    const composition = definePlugin({
      setup(context) {
        childInstallation = context.install(child);
      },
    });
    const host = createPluginHost();
    const parentInstallation = host.install(composition);

    await parentInstallation.whenActive();
    await expect(childInstallation?.whenActive()).rejects.toBe(childError);

    expect(parentInstallation.getSnapshot()).toEqual({ status: 'active' });
    expect(childInstallation?.getSnapshot()).toEqual({ status: 'failed', error: childError });

    await host.dispose();
  });

  test('rolls back a Composition tree when an awaited Child fails', async () => {
    const childError = new Error('required child failed');
    const cleanupOrder: string[] = [];
    let stableChildInstallation: PluginInstallation | undefined;
    let failingChildInstallation: PluginInstallation | undefined;
    const stableChild = definePlugin({
      setup(context) {
        context.own(() => {
          cleanupOrder.push('stable-child');
        });
      },
    });
    const failingChild = definePlugin({
      setup(context) {
        context.own(() => {
          cleanupOrder.push('failing-child');
        });
        throw childError;
      },
    });
    const composition = definePlugin({
      async setup(context) {
        context.own(() => {
          cleanupOrder.push('parent-first');
        });
        stableChildInstallation = context.install(stableChild);
        context.own(() => {
          cleanupOrder.push('parent-middle');
        });
        await stableChildInstallation.whenActive();
        failingChildInstallation = context.install(failingChild);
        context.own(() => {
          cleanupOrder.push('parent-last');
        });
        await failingChildInstallation.whenActive();
      },
    });
    const host = createPluginHost();
    const parentInstallation = host.install(composition);

    await expect(parentInstallation.whenActive()).rejects.toBe(childError);

    expect(cleanupOrder).toEqual(['failing-child', 'parent-last', 'parent-middle', 'stable-child', 'parent-first']);
    expect(parentInstallation.getSnapshot()).toEqual({ status: 'failed', error: childError });
    expect(stableChildInstallation?.getSnapshot()).toEqual({ status: 'disposed' });
    expect(failingChildInstallation?.getSnapshot()).toEqual({ status: 'disposed' });

    await host.dispose();
  });

  test('validates Child Installations in the same Service reservation graph', async () => {
    const firstService = defineService<{ readonly value: string }>('child-first');
    const secondService = defineService<{ readonly value: string }>('child-second');
    let firstChildInstallation: PluginInstallation | undefined;
    const firstChild = definePlugin({
      name: 'first-child',
      requires: { second: secondService },
      provides: { first: firstService },
      setup() {
        return { first: { value: 'first' } };
      },
    });
    const cyclicChild = definePlugin({
      name: 'cyclic-child',
      requires: { first: firstService },
      provides: { second: secondService },
      setup() {
        return { second: { value: 'second' } };
      },
    });
    const composition = definePlugin({
      async setup(context) {
        firstChildInstallation = context.install(firstChild);
        context.install(cyclicChild);
        await firstChildInstallation.whenActive();
      },
    });
    const host = createPluginHost();
    const parentInstallation = host.install(composition);
    const cycleError = await parentInstallation.whenActive().catch((error: unknown) => error);

    expect(cycleError).toMatchObject({
      code: 'DEPENDENCY_CYCLE',
      details: {
        path: [
          { plugin: 'first-child', provider: 'cyclic-child' },
          { plugin: 'cyclic-child', provider: 'first-child' },
        ],
      },
    });
    expect(firstChildInstallation?.getSnapshot()).toEqual({ status: 'disposed' });

    const replacement = host.install(
      definePlugin({
        provides: { first: firstService },
        setup() {
          return { first: { value: 'replacement' } };
        },
      }),
    );
    await replacement.whenActive();

    await host.dispose();
  });

  test('releases and recreates a Canvas-shaped Child tree with dependency-safe LIFO cleanup', async () => {
    const canvasScope = defineService<{ readonly generation: number }>('canvas-scope');
    const kernel = defineService<{ readonly generation: number }>('kernel');
    const renderer = defineService<{ readonly generation: number }>('renderer');
    const cleanupOrder: string[] = [];
    const childGenerations: Array<{
      readonly kernel: PluginInstallation;
      readonly renderer: PluginInstallation;
    }> = [];
    const createScopeProvider = (generation: number) =>
      definePlugin({
        provides: { canvasScope },
        setup() {
          return { canvasScope: { generation } };
        },
      });
    const kernelPlugin = definePlugin({
      provides: { kernel },
      setup(context, config: { generation: number }) {
        context.own(() => {
          cleanupOrder.push(`kernel-${config.generation}`);
        });
        return { kernel: { generation: config.generation } };
      },
    });
    const rendererPlugin = definePlugin({
      requires: { kernel },
      provides: { renderer },
      setup(context) {
        const generation = context.services.kernel.generation;
        context.own(() => {
          cleanupOrder.push(`renderer-${generation}`);
        });
        return { renderer: { generation } };
      },
    });
    const composition = definePlugin({
      requires: { canvasScope },
      async setup(context) {
        const generation = context.services.canvasScope.generation;
        context.own(() => {
          cleanupOrder.push(`parent-first-${generation}`);
        });
        const kernelInstallation = context.install(kernelPlugin, { generation });
        context.own(() => {
          cleanupOrder.push(`parent-middle-${generation}`);
        });
        const rendererInstallation = context.install(rendererPlugin);
        context.own(() => {
          cleanupOrder.push(`parent-last-${generation}`);
        });
        childGenerations.push({ kernel: kernelInstallation, renderer: rendererInstallation });
        await Promise.all([kernelInstallation.whenActive(), rendererInstallation.whenActive()]);
      },
    });
    const rendererConsumer = definePlugin({
      requires: { renderer },
      setup(context) {
        const generation = context.services.renderer.generation;
        context.own(() => {
          cleanupOrder.push(`renderer-consumer-${generation}`);
        });
      },
    });
    const host = createPluginHost();
    const consumerInstallation = host.install(rendererConsumer);
    const compositionInstallation = host.install(composition);
    const firstScope = host.install(createScopeProvider(1));
    await Promise.all([
      firstScope.whenActive(),
      compositionInstallation.whenActive(),
      consumerInstallation.whenActive(),
    ]);

    await firstScope.dispose();

    expect(cleanupOrder).toEqual([
      'parent-last-1',
      'renderer-consumer-1',
      'renderer-1',
      'parent-middle-1',
      'kernel-1',
      'parent-first-1',
    ]);
    expect(compositionInstallation.getSnapshot()).toEqual({ status: 'pending', missing: [canvasScope] });
    expect(consumerInstallation.getSnapshot()).toEqual({ status: 'pending', missing: [renderer] });
    expect(childGenerations[0]?.kernel.getSnapshot()).toEqual({ status: 'disposed' });
    expect(childGenerations[0]?.renderer.getSnapshot()).toEqual({ status: 'disposed' });

    const nextCompositionActivation = compositionInstallation.whenActive();
    const nextConsumerActivation = consumerInstallation.whenActive();
    const secondScope = host.install(createScopeProvider(2));
    await Promise.all([secondScope.whenActive(), nextCompositionActivation, nextConsumerActivation]);

    expect(childGenerations).toHaveLength(2);
    expect(childGenerations[1]?.kernel.getSnapshot()).toEqual({ status: 'active' });
    expect(childGenerations[1]?.renderer.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
  });

  test('returns one idempotent installation disposal promise', async () => {
    let disposeCount = 0;
    const plugin = definePlugin({
      setup(context) {
        context.own(() => {
          disposeCount += 1;
        });
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);
    await installation.whenActive();

    const firstDispose = installation.dispose();
    const secondDispose = installation.dispose();

    expect(secondDispose).toBe(firstDispose);
    await firstDispose;
    expect(disposeCount).toBe(1);
    expect(installation.dispose()).toBe(firstDispose);
  });

  test('aborts pending setup and waits for it before becoming disposed', async () => {
    let setupSignal: AbortSignal | undefined;
    let finishSetup: (() => void) | undefined;
    let markSetupStarted: (() => void) | undefined;
    const setupStarted = new Promise<void>((resolve) => {
      markSetupStarted = resolve;
    });
    const plugin = definePlugin({
      async setup(context) {
        setupSignal = context.signal;
        markSetupStarted?.();
        await new Promise<void>((resolve) => {
          finishSetup = resolve;
        });
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);
    const observedStatuses: string[] = [];
    installation.subscribe(() => {
      observedStatuses.push(installation.getSnapshot().status);
    });
    await setupStarted;

    const activeResult = installation.whenActive().catch((error: unknown) => error);
    const disposal = installation.dispose();
    let disposalFinished = false;
    void disposal.then(() => {
      disposalFinished = true;
    });

    expect(setupSignal?.aborted).toBe(true);
    await Promise.resolve();
    expect(disposalFinished).toBe(false);

    finishSetup?.();
    await disposal;

    expect(await activeResult).toMatchObject({ code: 'INSTALLATION_DISPOSED' });
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(observedStatuses).toEqual(['disposed']);
  });

  test('disposes every independent installation and closes the host', async () => {
    const firstConfig = { id: 'first' };
    const secondConfig = { id: 'second' };
    const receivedConfigs: Array<{ id: string }> = [];
    const disposedPlugins: string[] = [];
    const plugin = definePlugin<{ id: string }>({
      setup(context, config) {
        receivedConfigs.push(config);
        context.own(() => {
          disposedPlugins.push(config.id);
        });
      },
    });
    const host = createPluginHost();
    const firstInstallation = host.install(plugin, firstConfig);
    const secondInstallation = host.install(plugin, secondConfig);
    await Promise.all([firstInstallation.whenActive(), secondInstallation.whenActive()]);

    const firstDispose = host.dispose();
    const secondDispose = host.dispose();

    expect(secondDispose).toBe(firstDispose);
    await firstDispose;
    expect(receivedConfigs).toEqual([firstConfig, secondConfig]);
    expect(disposedPlugins.sort()).toEqual(['first', 'second']);
    expect(firstInstallation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(secondInstallation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(() => host.install(plugin, firstConfig)).toThrow(expect.objectContaining({ code: 'HOST_DISPOSED' }));
  });

  test('rolls back owned resources when setup fails', async () => {
    const setupError = new Error('cannot activate');
    const disposedResources: string[] = [];
    const plugin = definePlugin({
      setup(context) {
        context.own(() => {
          disposedResources.push('first');
        });
        context.own(() => {
          disposedResources.push('second');
        });
        throw setupError;
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);

    await expect(installation.whenActive()).rejects.toBe(setupError);

    expect(disposedResources).toEqual(['second', 'first']);
    expect(installation.getSnapshot()).toEqual({
      status: 'failed',
      error: setupError,
    });
  });

  test('continues cleanup and reports every disposer failure', async () => {
    const firstError = new Error('first cleanup failed');
    const secondError = new Error('second cleanup failed');
    const cleanupAttempts: string[] = [];
    const plugin = definePlugin({
      setup(context) {
        context.own(() => {
          cleanupAttempts.push('first');
          throw firstError;
        });
        context.own(async () => {
          await Promise.resolve();
          cleanupAttempts.push('middle');
        });
        context.own(() => {
          cleanupAttempts.push('second');
          throw secondError;
        });
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);
    await installation.whenActive();

    const firstDisposal = installation.dispose();
    const secondDisposal = installation.dispose();
    const disposalError = await firstDisposal.catch((error: unknown) => error);

    expect(secondDisposal).toBe(firstDisposal);
    expect(disposalError).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(disposalError)).toEqual([secondError, firstError]);
    expect(cleanupAttempts).toEqual(['second', 'middle', 'first']);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(installation.dispose()).toBe(firstDisposal);
    await expect(installation.whenActive()).rejects.toMatchObject({ code: 'INSTALLATION_DISPOSED' });
  });

  test('reports cleanup failures from every host installation together', async () => {
    const firstError = new Error('first installation cleanup failed');
    const secondError = new Error('second installation cleanup failed');
    const createFailingPlugin = (error: Error) =>
      definePlugin({
        setup(context) {
          context.own(() => {
            throw error;
          });
        },
      });
    const host = createPluginHost();
    const firstInstallation = host.install(createFailingPlugin(firstError));
    const secondInstallation = host.install(createFailingPlugin(secondError));
    await Promise.all([firstInstallation.whenActive(), secondInstallation.whenActive()]);

    const disposalError = await host.dispose().catch((error: unknown) => error);

    expect(disposalError).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(disposalError)).toEqual([firstError, secondError]);
    expect(firstInstallation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(secondInstallation.getSnapshot()).toEqual({ status: 'disposed' });
  });

  test('preserves cleanup aggregation stages through Host disposal', async () => {
    const leafError = new Error('disposer failed');
    const plugin = definePlugin({
      setup(context) {
        context.own(() => {
          throw leafError;
        });
      },
    });
    const host = createPluginHost();
    const installation = host.install(plugin);
    await installation.whenActive();

    const hostError = await host.dispose().catch((error: unknown) => error);

    expect(hostError).toBeInstanceOf(AggregateError);
    const installationError = (hostError as AggregateError).errors[0];
    expect(installationError).toBeInstanceOf(AggregateError);
    const activationError = (installationError as AggregateError).errors[0];
    expect(activationError).toBeInstanceOf(AggregateError);
    expect({
      hostMessage: (hostError as AggregateError).message,
      installationMessage: (installationError as AggregateError).message,
      activationMessage: (activationError as AggregateError).message,
      leaf: (activationError as AggregateError).errors[0],
    }).toEqual({
      hostMessage: 'Plugin Host cleanup failed.',
      installationMessage: 'Plugin resource cleanup failed.',
      activationMessage: 'Plugin resource cleanup failed.',
      leaf: leafError,
    });
  });

  test('reports an owned Child cleanup failure once during terminal Host disposal', async () => {
    const childError = new Error('child cleanup failed');
    let childInstallation: PluginInstallation | undefined;
    const child = definePlugin({
      setup(context) {
        context.own(() => {
          throw childError;
        });
      },
    });
    const composition = definePlugin({
      async setup(context) {
        childInstallation = context.install(child);
        await childInstallation.whenActive();
      },
    });
    const host = createPluginHost();
    const parentInstallation = host.install(composition);
    await parentInstallation.whenActive();

    const firstDisposal = host.dispose();
    const secondDisposal = host.dispose();
    const disposalError = await firstDisposal.catch((error: unknown) => error);

    expect(secondDisposal).toBe(firstDisposal);
    expect(disposalError).toBeInstanceOf(AggregateError);
    expect(collectAggregateLeaves(disposalError)).toEqual([childError]);
    expect(parentInstallation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(childInstallation?.getSnapshot()).toEqual({ status: 'disposed' });
    expect(() => host.install(child)).toThrow(expect.objectContaining({ code: 'HOST_DISPOSED' }));
  });
});

function collectAggregateLeaves(error: unknown): unknown[] {
  if (!(error instanceof AggregateError)) return [error];
  return error.errors.flatMap(collectAggregateLeaves);
}
