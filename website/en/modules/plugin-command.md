---
title: '@nodebraid/plugin-command'
description: Activation-scoped, strongly typed Command registration, execution, cancellation, and cleanup.
---

# `@nodebraid/plugin-command`

::: warning Package is not publicly released
This name describes the current source-module boundary; it does not mean the package can be installed from npm. Follow the source-based [Quick Start](/en/guide/quick-start) to verify it.
:::

## Problems it solves

Implementing actions as direct callbacks scatters identity, input and output types, cancellation, and resource ownership across callers. `@nodebraid/plugin-command` provides a NodeBraid-owned Runtime seam: Feature Plugins register strongly typed Commands, other Consumers execute them through the same token, and every registration and in-flight execution is owned by the current Activation.

The Command Service owns only the execution protocol. It does not own Kernel, Session, or domain state, and it does not become a dynamic service locator.

## When to use it

- You want several entry points to share the same application action;
- You need a Command's input and output types to remain connected at compile time;
- Your handler may run asynchronously and needs caller cancellation;
- You want Command registrations and in-flight work to be released with the Plugin Activation;
- You are implementing Layout, History, or another Feature Plugin that needs a stable action entry point.

## What it provides

- `defineCommand<Input, Output>(id)`: creates a runtime-unique, strongly typed, frozen Command token;
- `CommandService.register()`: registers one handler for the exact token;
- `CommandService.execute()`: executes synchronous or asynchronous handlers through one Promise seam;
- `CommandExecutionContext`: provides the diagnostic `commandId` and an independent `AbortSignal` for the invocation;
- `CommandRegistration.dispose()`: removes the registration from lookup, cancels its executions, and waits for all of them;
- `CommandError`: exposes structural failures through a stable domain and code.

The Command's string ID is used only for diagnostics and to prevent ambiguous registrations. Execution lookup uses the object identity returned by `defineCommand()`; recreating a token with the same name cannot impersonate an already registered Command.

## Dependencies and composition

This package depends on the Plugin Host seam from `@nodebraid/runtime-cordis` and structured errors from `@nodebraid/diagnostics`. It does not depend on Kernel, Session, History, or `@nodebraid/core`.

A Feature Plugin should obtain its dependencies through its own Required Service bindings and own the registration:

```ts
import { commandPlugin, commandService, defineCommand, type CommandService } from '@nodebraid/plugin-command';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

const greet = defineCommand<string, string>('message.greet');
let commands: CommandService | undefined;

const feature = definePlugin({
  requires: { commands: commandService },
  setup(context) {
    const registration = context.services.commands.register(greet, async (name, execution) => {
      execution.signal.throwIfAborted();
      await Promise.resolve();
      execution.signal.throwIfAborted();
      return `Hello, ${name}`;
    });
    context.own(() => registration.dispose());
  },
});

const consumer = definePlugin({
  requires: { commands: commandService },
  setup(context) {
    commands = context.services.commands;
  },
});

const host = createPluginHost();
const commandInstallation = host.install(commandPlugin);
const featureInstallation = host.install(feature);
const consumerInstallation = host.install(consumer);
await Promise.all([
  commandInstallation.whenActive(),
  featureInstallation.whenActive(),
  consumerInstallation.whenActive(),
]);
if (!commands) throw new Error('Expected Command Service to activate.');

try {
  console.log(await commands.execute(greet, 'NodeBraid'));
} finally {
  await host.dispose();
}
```

A real application would usually retain or adapt `CommandService` within a Consumer Activation rather than place it in a global variable. The example focuses on Required Services, Activation waiting, and Host cleanup boundaries.

## Public entry points

```ts
import {
  commandPlugin,
  commandService,
  defineCommand,
  CommandError,
  type Command,
  type CommandExecutionContext,
  type CommandExecutionOptions,
  type CommandHandler,
  type CommandRegistration,
  type CommandService,
} from '@nodebraid/plugin-command';
```

These entry points are also re-exported by `@nodebraid/core`.

## Lifecycle and error semantics

Every `commandPlugin` Activation creates an empty `CommandService`. An Installation that requires the Command Service remains pending until the Provider appears. `whenActive()` waits for a real Activation and does not return a placeholder Service.

`execute()` always returns a Promise. Synchronous throws, asynchronous rejections, and successful values preserve their original identity; they are not wrapped into manufactured results. The caller signal is propagated only to that invocation's handler. Cancellation is cooperative: the handler must observe the signal and decide whether it ultimately resolves or rejects.

`CommandRegistration.dispose()` provides these guarantees:

1. The Command disappears from execution lookup immediately;
2. The signals of all handlers that have already started are aborted;
3. Disposal waits for those handlers to settle;
4. The token and ID remain reserved while disposal is waiting, preventing old and new handlers from overlapping;
5. Repeated calls, including reentrant calls from an abort listener, return the same Promise.

Provider deactivation and `host.dispose()` perform the same cleanup for remaining registrations. If a handler ignores its signal and never settles, Host cleanup remains pending; the implementation has no timeout, forced success, or error-swallowing fallback.

| Code                         | Trigger                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `INVALID_COMMAND`            | The ID is empty or has an invalid type, or the token was not created by `defineCommand()` |
| `COMMAND_ALREADY_REGISTERED` | The token or diagnostic ID is still reserved by the current Activation                    |
| `COMMAND_NOT_FOUND`          | The exact token is unregistered, or its registration is being disposed                    |
| `SERVICE_DISPOSED`           | The Activation that owned the old Command Service has ended                               |

Definition and registration failures throw synchronously; execution failures reject the Promise. Errors from the handler itself are not rewritten as `CommandError`.

## Limitations and non-goals

- Does not inject Kernel, Session, or arbitrary dynamic dependencies;
- No middleware, priority, permissions, queue, serialization, retries, or deduplication;
- Does not automatically make Commands undoable; History observes only real Commits;
- Does not prescribe which result a handler must return after an abort;
- No global Command Registry or lookup across Plugin Hosts.

## Verification evidence

Package behavior tests use the real Plugin Host to cover empty IDs, forged tokens, same-ID conflicts, synchronous and asynchronous results, original handler errors, caller-cancellation isolation, in-flight disposal, reentrant idempotent cleanup, Provider deactivation, stale Service invalidation, and reactivation. Type tests lock down the invariant relationship between Command inputs and outputs; declaration checks ensure that Cordis and core types do not leak.
