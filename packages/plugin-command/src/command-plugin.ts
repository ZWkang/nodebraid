import { definePlugin, defineService } from '@cflow/runtime-cordis';

import { getCommandId } from './command-definition';
import { CommandError } from './command-error';
import type {
  Command,
  CommandExecutionContext,
  CommandExecutionOptions,
  CommandHandler,
  CommandRegistration,
  CommandService,
} from './contracts';

type AnyCommand = Command<unknown, unknown>;
type AnyCommandHandler = CommandHandler<unknown, unknown>;

interface RunningExecution {
  readonly controller: AbortController;
  readonly settled: Promise<void>;
}

interface RegisteredCommand {
  readonly command: AnyCommand;
  readonly commandId: string;
  readonly handler: AnyCommandHandler;
  readonly executions: Set<RunningExecution>;
  disposePromise?: Promise<void>;
}

export const commandService = defineService<CommandService>('command');

export const commandPlugin = definePlugin({
  name: '@cflow/plugin-command',
  provides: { commands: commandService },
  setup(context) {
    const registrations = new Map<AnyCommand, RegisteredCommand>();
    const commandsById = new Map<string, RegisteredCommand>();
    let disposed = false;

    const assertActive = (): void => {
      if (disposed) {
        throw new CommandError('SERVICE_DISPOSED', 'Command Service Activation has been disposed.');
      }
    };

    const disposeRegistration = (registration: RegisteredCommand): Promise<void> => {
      if (registration.disposePromise) return registration.disposePromise;
      let completeDisposal!: () => void;
      // Publish the Promise before aborting because an abort listener may
      // synchronously re-enter dispose() and must receive the same result.
      registration.disposePromise = new Promise<void>((resolve) => {
        completeDisposal = resolve;
      });
      const executions = Array.from(registration.executions);
      for (const execution of executions) execution.controller.abort();
      // execute() treats disposePromise as unavailable, while both maps keep
      // the token and ID reserved until every already-started handler settles.
      void Promise.all(executions.map((execution) => execution.settled)).then(() => {
        if (registrations.get(registration.command) === registration) {
          registrations.delete(registration.command);
        }
        if (commandsById.get(registration.commandId) === registration) {
          commandsById.delete(registration.commandId);
        }
        completeDisposal();
      });
      return registration.disposePromise;
    };

    const service: CommandService = Object.freeze({
      register<Input, Output>(
        command: Command<Input, Output>,
        handler: CommandHandler<Input, Output>,
      ): CommandRegistration {
        assertActive();
        const commandId = getCommandId(command);
        if (registrations.has(command as AnyCommand) || commandsById.has(commandId)) {
          throw new CommandError(
            'COMMAND_ALREADY_REGISTERED',
            `Command "${commandId}" is already registered.`,
            Object.freeze({ commandId }),
          );
        }
        const registration: RegisteredCommand = {
          command: command as AnyCommand,
          commandId,
          handler: handler as AnyCommandHandler,
          executions: new Set(),
        };
        registrations.set(registration.command, registration);
        commandsById.set(commandId, registration);
        return Object.freeze({
          dispose() {
            return disposeRegistration(registration);
          },
        });
      },
      async execute<Input, Output>(
        command: Command<Input, Output>,
        input: Input,
        options?: CommandExecutionOptions,
      ): Promise<Output> {
        assertActive();
        const commandId = getCommandId(command);
        const registration = registrations.get(command as AnyCommand);
        if (!registration || registration.disposePromise) {
          throw new CommandError(
            'COMMAND_NOT_FOUND',
            `Command "${commandId}" is not registered.`,
            Object.freeze({ commandId }),
          );
        }
        const activeRegistration = registration;
        const controller = new AbortController();
        const abort = () => controller.abort(options?.signal?.reason);
        options?.signal?.addEventListener('abort', abort, { once: true });
        if (options?.signal?.aborted) abort();
        let settleExecution!: () => void;
        const settled = new Promise<void>((resolve) => {
          settleExecution = resolve;
        });
        const execution: RunningExecution = { controller, settled };
        // Track before invoking so synchronous handler code can dispose or
        // re-enter the Service without escaping lifecycle ownership.
        activeRegistration.executions.add(execution);
        const executionContext: CommandExecutionContext = Object.freeze({
          commandId,
          signal: controller.signal,
        });
        let result: Promise<Output>;
        try {
          result = Promise.resolve(
            (activeRegistration.handler as CommandHandler<Input, Output>)(input, executionContext),
          );
        } catch (error) {
          result = Promise.reject(error);
        }
        result.then(
          () => finishExecution(),
          () => finishExecution(),
        );
        return result;

        function finishExecution(): void {
          activeRegistration.executions.delete(execution);
          options?.signal?.removeEventListener('abort', abort);
          settleExecution();
        }
      },
    });
    context.own(async () => {
      disposed = true;
      const remainingRegistrations = Array.from(registrations.values());
      await Promise.all(remainingRegistrations.map((registration) => disposeRegistration(registration)));
    });
    return { commands: service };
  },
});
