import { describe, expect, test } from 'bun:test';

import { createPluginHost, definePlugin, type PluginInstallation } from '@cflow/runtime-cordis';

import { CommandError, commandPlugin, commandService, defineCommand, type Command, type CommandService } from '../src';

describe('@cflow/plugin-command', () => {
  test('rejects an empty Command ID with a stable structural error', () => {
    expect(() => defineCommand('')).toThrow(CommandError);
    try {
      defineCommand('');
    } catch (error) {
      expect((error as CommandError).code).toBe('INVALID_COMMAND');
      expect((error as CommandError).details).toEqual({ commandId: '' });
    }
  });

  test('registers and executes one typed Command in an Activation', async () => {
    const double = defineCommand<number, number>('number.double');
    let commands: CommandService | undefined;
    let executionCommandId: string | undefined;
    let executionSignal: AbortSignal | undefined;
    const feature = definePlugin({
      requires: { commands: commandService },
      setup(context) {
        commands = context.services.commands;
        const registration = commands.register(double, (input, execution) => {
          executionCommandId = execution.commandId;
          executionSignal = execution.signal;
          return input * 2;
        });
        context.own(() => registration.dispose());
      },
    });
    const host = createPluginHost();
    const provider = host.install(commandPlugin);
    const consumer = host.install(feature);
    await Promise.all([provider.whenActive(), consumer.whenActive()]);
    if (!commands) throw new Error('Expected Command Service to activate.');

    await expect(commands.execute(double, 21)).resolves.toBe(42);
    expect(executionCommandId).toBe('number.double');
    expect(executionSignal?.aborted).toBeFalse();

    await host.dispose();
  });

  test('preserves asynchronous Command results and handler errors', async () => {
    const succeed = defineCommand<string, string>('message.uppercase');
    const fail = defineCommand<void, never>('message.fail');
    const handlerError = new Error('Command failed');
    const { host, service } = await activateCommandService();
    const successRegistration = service.register(succeed, async (input) => input.toUpperCase());
    const failureRegistration = service.register(fail, () => {
      throw handlerError;
    });

    await expect(service.execute(succeed, 'ready')).resolves.toBe('READY');
    await expect(service.execute(fail, undefined)).rejects.toBe(handlerError);

    await Promise.all([successRegistration.dispose(), failureRegistration.dispose()]);
    await host.dispose();
  });

  test('enforces Command token identity and diagnostic ID uniqueness', async () => {
    const first = defineCommand<number, number>('number.increment');
    const sameId = defineCommand<string, string>('number.increment');
    const forged = Object.freeze({ id: 'forged' }) as Command<void, void>;
    const { host, service } = await activateCommandService();
    const registration = service.register(first, (input) => input + 1);

    expectCommandError(() => service.register(first, (input) => input), 'COMMAND_ALREADY_REGISTERED');
    expectCommandError(() => service.register(sameId, (input) => input), 'COMMAND_ALREADY_REGISTERED');
    expectCommandError(() => service.register(forged, () => {}), 'INVALID_COMMAND');
    await expect(service.execute(sameId, 'value')).rejects.toMatchObject({ code: 'COMMAND_NOT_FOUND' });
    await expect(service.execute(first, 1)).resolves.toBe(2);

    await registration.dispose();
    const replacement = service.register(sameId, (input) => input.toUpperCase());
    await expect(service.execute(sameId, 'ready')).resolves.toBe('READY');
    await replacement.dispose();
    await host.dispose();
  });

  test('unregisters, aborts, and awaits in-flight Command executions', async () => {
    const wait = defineCommand<void, string>('execution.wait');
    const completion = createDeferred<string>();
    let executionSignal: AbortSignal | undefined;
    const { host, service } = await activateCommandService();
    const registration = service.register(wait, (_input, context) => {
      executionSignal = context.signal;
      return completion.promise;
    });
    const execution = service.execute(wait, undefined);
    const replacement = defineCommand<void, string>('execution.wait');
    let disposeSettled = false;
    const disposal = registration.dispose().then(() => {
      disposeSettled = true;
    });

    expect(registration.dispose()).toBe(registration.dispose());
    await Promise.resolve();
    expect(executionSignal?.aborted).toBeTrue();
    expect(disposeSettled).toBeFalse();
    await expect(service.execute(wait, undefined)).rejects.toMatchObject({ code: 'COMMAND_NOT_FOUND' });
    expectCommandError(() => service.register(replacement, () => 'early'), 'COMMAND_ALREADY_REGISTERED');

    completion.resolve('finished');
    await expect(execution).resolves.toBe('finished');
    await disposal;
    expect(disposeSettled).toBeTrue();
    const replacementRegistration = service.register(replacement, () => 'ready');
    await expect(service.execute(replacement, undefined)).resolves.toBe('ready');
    await replacementRegistration.dispose();

    await host.dispose();
  });

  test('keeps Registration disposal idempotent when abort handling reenters dispose', async () => {
    const wait = defineCommand<void, void>('execution.reentrant-dispose');
    const completion = createDeferred<void>();
    const { host, service } = await activateCommandService();
    let registration!: ReturnType<CommandService['register']>;
    let reentrantDisposal: Promise<void> | undefined;
    registration = service.register(wait, (_input, context) => {
      context.signal.addEventListener(
        'abort',
        () => {
          reentrantDisposal = registration.dispose();
        },
        { once: true },
      );
      return completion.promise;
    });
    const execution = service.execute(wait, undefined);

    const disposal = registration.dispose();
    expect(reentrantDisposal).toBe(disposal);
    expect(registration.dispose()).toBe(disposal);

    completion.resolve();
    await execution;
    await disposal;
    await host.dispose();
  });

  test('closes residual registrations before disposing the Command Service Activation', async () => {
    const wait = defineCommand<void, string>('execution.activation-wait');
    const completion = createDeferred<string>();
    let executionSignal: AbortSignal | undefined;
    const { host, provider, service } = await activateCommandService();
    service.register(wait, (_input, context) => {
      executionSignal = context.signal;
      return completion.promise;
    });
    const execution = service.execute(wait, undefined);
    let disposeSettled = false;
    const disposal = provider.dispose().then(() => {
      disposeSettled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(executionSignal?.aborted).toBeTrue();
    expect(disposeSettled).toBeFalse();

    completion.resolve('closed');
    await expect(execution).resolves.toBe('closed');
    await disposal;
    expectCommandError(() => service.register(wait, () => 'late'), 'SERVICE_DISPOSED');
    await expect(service.execute(wait, undefined)).rejects.toMatchObject({ code: 'SERVICE_DISPOSED' });

    await host.dispose();
  });

  test('isolates caller cancellation to one Command execution', async () => {
    const wait = defineCommand<number, number>('execution.caller-cancel');
    const completions = [createDeferred<number>(), createDeferred<number>()];
    const signals: AbortSignal[] = [];
    const { host, service } = await activateCommandService();
    const registration = service.register(wait, (input, context) => {
      signals[input] = context.signal;
      return completions[input]!.promise;
    });
    const firstController = new AbortController();
    const first = service.execute(wait, 0, { signal: firstController.signal });
    const second = service.execute(wait, 1);

    firstController.abort('caller-cancelled');
    expect(signals[0]?.aborted).toBeTrue();
    expect(signals[0]?.reason).toBe('caller-cancelled');
    expect(signals[1]?.aborted).toBeFalse();

    completions[0]!.resolve(10);
    completions[1]!.resolve(20);
    await expect(Promise.all([first, second])).resolves.toEqual([10, 20]);
    await registration.dispose();
    await host.dispose();
  });

  test('reinstalls an empty Command Service after Provider disposal', async () => {
    const identity = defineCommand<string, string>('identity');
    const services: CommandService[] = [];
    const feature = definePlugin({
      requires: { commands: commandService },
      setup(context) {
        services.push(context.services.commands);
        const registration = context.services.commands.register(identity, (input) => input);
        context.own(() => registration.dispose());
      },
    });
    const host = createPluginHost();
    const firstProvider = host.install(commandPlugin);
    const consumer = host.install(feature);
    await Promise.all([firstProvider.whenActive(), consumer.whenActive()]);
    const firstService = services[0]!;
    await expect(firstService.execute(identity, 'first')).resolves.toBe('first');

    await firstProvider.dispose();
    await expect(firstService.execute(identity, 'late')).rejects.toMatchObject({ code: 'SERVICE_DISPOSED' });
    const nextActivation = consumer.whenActive();
    const secondProvider = host.install(commandPlugin);
    await Promise.all([secondProvider.whenActive(), nextActivation]);
    const secondService = services[1]!;

    expect(secondService).not.toBe(firstService);
    await expect(secondService.execute(identity, 'second')).resolves.toBe('second');
    await host.dispose();
  });
});

function expectCommandError(callback: () => unknown, code: CommandError['code']): void {
  try {
    callback();
    throw new Error(`Expected CommandError ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(CommandError);
    expect((error as CommandError).code).toBe(code);
  }
}

async function activateCommandService(): Promise<{
  readonly host: ReturnType<typeof createPluginHost>;
  readonly provider: PluginInstallation;
  readonly service: CommandService;
}> {
  let service: CommandService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService },
    setup(context) {
      service = context.services.commands;
    },
  });
  const host = createPluginHost();
  const provider = host.install(commandPlugin);
  const installation = host.install(consumer);
  await Promise.all([provider.whenActive(), installation.whenActive()]);
  if (!service) throw new Error('Expected Command Service to activate.');
  return { host, provider, service };
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
