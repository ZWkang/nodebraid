# @nodebraid/runtime-cordis

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/runtime-cordis) · [简体中文](https://zwkang.github.io/nodebraid/modules/runtime-cordis)

Cordis-backed Plugin Host for NodeBraid Canvas Runtime instances.

The package exposes NodeBraid-owned Plugin lifecycle interfaces and keeps Cordis
Context, Fiber, Service, and effect types inside the implementation.

Most consumers should import these interfaces from the `@nodebraid/core` public
facade. This package remains available as the narrow implementation entry for
advanced consumers and does not depend on `@nodebraid/core`.

Create one Host-scoped diagnostics path when the application needs structured
events or explicit Fault handling:

```ts
import { createPluginHost } from '@nodebraid/runtime-cordis';

const host = createPluginHost({
  diagnostics: {
    hostId: 'editor.primary',
    sink: (event) => console.log(event.name, event.scope, event.attributes),
    faultReporter: ({ error }) => globalThis.reportError(error),
  },
});

await host.dispose();
```

The Sink is synchronous and observational. Successful event delivery never
consumes a thrown/rejected failure or an unhandled subscriber Fault.
