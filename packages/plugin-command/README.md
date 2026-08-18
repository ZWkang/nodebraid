# @cflow/plugin-command

Command Runtime Plugin for CFlow Canvas Runtime instances.

```ts
import { commandPlugin, commandService, defineCommand } from '@cflow/plugin-command';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

const greet = defineCommand<string, string>('message.greet');
const feature = definePlugin({
  requires: { commands: commandService },
  setup(context) {
    const registration = context.services.commands.register(greet, async (name, execution) => {
      if (execution.signal.aborted) throw execution.signal.reason;
      return `Hello, ${name}`;
    });
    context.own(() => registration.dispose());
  },
});

const host = createPluginHost();
host.install(commandPlugin);
host.install(feature);
```

Each Plugin Activation owns an empty `CommandService`. Command tokens preserve
input and output types while remaining runtime-unique; diagnostic IDs detect
ambiguous registrations and can be passed into Kernel Transaction metadata.

Command handlers obtain Kernel, Session, or external dependencies through the
Feature Plugin's declared Runtime Service bindings. The Command Service owns
only registration, execution, cancellation, and cleanup. Registration disposal
aborts and awaits all in-flight handlers without timeouts or fake completion.

The package depends on the CFlow-owned Plugin Host seam in
`@cflow/runtime-cordis`, not on `@cflow/kernel`, `@cflow/plugin-kernel`, or
`@cflow/core`. It does not expose Cordis types.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@cflow/plugin-command' typecheck
bun run --filter '@cflow/plugin-command' test
bun run --filter '@cflow/plugin-command' build
bun run --filter '@cflow/plugin-command' build:dependencies
```

## License

[MIT](./LICENSE)
