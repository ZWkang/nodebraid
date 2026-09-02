---
title: '@nodebraid/plugin-port'
description: Activation-scoped Port Contributions and deterministic Snapshot Runtime.
---

# `@nodebraid/plugin-port`

::: warning Package is not publicly released
This name describes the current source boundary; it is not an npm installation claim. Use the source checkout in the [Quick Start](/en/guide/quick-start).
:::

`portPlugin` provides one narrow `portService` for a Canvas Runtime. Node type or domain Plugins use `createPortContributionPlugin()` to register a named, synchronous contribution that depends only on the current committed Node value. The Registration disappears with its Activation and notifies Renderer and Interaction to revalidate.

```ts
import { createPortContributionPlugin } from '@nodebraid/plugin-port';

const taskPorts = createPortContributionPlugin({
  id: 'acme.task-ports',
  definePorts(node) {
    return node.type === 'task'
      ? [
          { id: 'input', role: 'target' },
          { id: 'output', role: 'source' },
        ]
      : [];
  },
});
```

The Service resolves and freezes `PortSnapshot` values deterministically by Contribution and Port ID. Duplicate Contribution IDs, duplicate per-Node Port IDs, malformed definitions, and disposed Services fail explicitly; subscriber faults use stable diagnostics. The package creates no Port entities, Persistence, generic Registry, business Validation framework, or product UI.
