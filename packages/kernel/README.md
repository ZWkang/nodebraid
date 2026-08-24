# @nodebraid/kernel

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/kernel) · [简体中文](https://zwkang.github.io/nodebraid/modules/kernel)

Renderer-independent graph state and Transaction semantics for NodeBraid.

```ts
import { createCanvasKernel, nodeId } from '@nodebraid/kernel';

const kernel = createCanvasKernel();
const taskId = nodeId('task');

kernel.transact((transaction) => {
  transaction.nodes.add({
    id: taskId,
    type: 'task',
    position: { x: 0, y: 0 },
    data: null,
  });
});
```

The Kernel owns one authoritative Document and exposes revision-bound Canvas
Views, strict synchronous Transactions, Canvas Query, and reversible
before/after Change Sets. It has no dependency on Plugin Host, Cordis, RxJS,
Renderer implementations, DOM objects, or framework adapters.

Its only shared infrastructure dependency is the zero-runtime
`@nodebraid/diagnostics` error contract; the Kernel does not emit Diagnostic Events.

The implemented Kernel Runtime Plugin adapter lives in `@nodebraid/plugin-kernel`
and intentionally remains outside this package.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@nodebraid/kernel' typecheck
bun run --filter '@nodebraid/kernel' test
bun run --filter '@nodebraid/kernel' build
```

## License

[MIT](./LICENSE)
