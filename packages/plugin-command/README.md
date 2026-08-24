# @nodebraid/plugin-command

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/plugin-command) · [简体中文](https://zwkang.github.io/nodebraid/modules/plugin-command)

Command Runtime Plugin for NodeBraid Canvas Runtime instances.

```ts
import { commandPlugin, commandService, defineCommand, type CommandService } from '@nodebraid/plugin-command';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

const greet = defineCommand<string, string>('message.greet');
let commands: CommandService | undefined;
const feature = definePlugin({
  requires: { commands: commandService },
  setup(context) {
    commands = context.services.commands;
    const registration = context.services.commands.register(greet, async (name, execution) => {
      execution.signal.throwIfAborted();
      await Promise.resolve();
      execution.signal.throwIfAborted();
      return `Hello, ${name}`;
    });
    context.own(() => registration.dispose());
  },
});

const host = createPluginHost();
const provider = host.install(commandPlugin);
const consumer = host.install(feature);
await Promise.all([provider.whenActive(), consumer.whenActive()]);
if (!commands) throw new Error('Expected Command Service to activate.');

const controller = new AbortController();
const message = await commands.execute(greet, 'NodeBraid', { signal: controller.signal });
console.log(message);

const cancelled = commands.execute(greet, 'NodeBraid', { signal: controller.signal });
controller.abort();
await cancelled.catch((error) => {
  if (error !== controller.signal.reason) throw error;
});

await host.dispose();
```

Each Plugin Activation owns an empty `CommandService`. Command tokens preserve
input and output types while remaining runtime-unique; diagnostic IDs detect
ambiguous registrations and can be passed into Kernel Transaction metadata.

Command handlers obtain Kernel, Session, or external dependencies through the
Feature Plugin's declared Runtime Service bindings. The Command Service owns
only registration, execution, cancellation, and cleanup. Registration disposal
aborts and awaits all in-flight handlers without timeouts or fake completion.

## Execution and lifecycle

- `execute()` always returns a Promise. Synchronous and asynchronous handler
  results use the same path, and handler errors retain their original value.
- A caller `AbortSignal` aborts only that invocation's handler signal.
  Cancellation is cooperative: the handler decides how the signal affects its
  result, as the example does with `throwIfAborted()`.
- `CommandRegistration.dispose()` makes the Command unavailable immediately,
  aborts every in-flight handler signal, and resolves only after those handlers
  settle. The token and diagnostic ID remain reserved until then, so a
  replacement cannot overlap the old registration.
- Command Service deactivation applies the same cleanup to every remaining
  registration. An old Service rejects later registration or execution rather
  than silently accepting work.

Structural failures use `CommandError` with a stable code:

| Code                         | Meaning                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `INVALID_COMMAND`            | The ID is empty or the token was not created by `defineCommand` |
| `COMMAND_ALREADY_REGISTERED` | The token or diagnostic ID is still reserved                    |
| `COMMAND_NOT_FOUND`          | The exact token is unregistered or currently disposing          |
| `SERVICE_DISPOSED`           | The Command Service Activation has ended                        |

Registration failures throw synchronously. Execution failures reject the
returned Promise; errors thrown or rejected by a handler are not wrapped in a
`CommandError`.

The package depends on the NodeBraid-owned Plugin Host seam in
`@nodebraid/runtime-cordis`, not on `@nodebraid/kernel`, `@nodebraid/plugin-kernel`, or
`@nodebraid/core`. It does not expose Cordis types.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@nodebraid/plugin-command' typecheck
bun run --filter '@nodebraid/plugin-command' test
bun run --filter '@nodebraid/plugin-command' build
bun run --filter '@nodebraid/plugin-command' build:dependencies
```

## License

[MIT](./LICENSE)
