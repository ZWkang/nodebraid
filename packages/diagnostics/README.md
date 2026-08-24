# @nodebraid/diagnostics

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/diagnostics) · [简体中文](https://zwkang.github.io/nodebraid/modules/diagnostics)

Structured errors and Diagnostic Event contracts for NodeBraid.

```ts
import {
  NodeBraidError,
  describeDiagnosticEvent,
  describeError,
  describeNonFiniteNumber,
  diagnosticEvents,
  type DiagnosticSink,
} from '@nodebraid/diagnostics';
```

Every NodeBraid structural error extends `NodeBraidError` and exposes a stable
`domain + code` identity with recursively immutable JSON-safe details. User
Callback, Plugin Setup, Command Handler, Provider, and Abort failures remain
their original values.

`DiagnosticSink` receives immutable in-process events. A Sink can use
`describeDiagnosticEvent()` before JSON serialization so raw errors become a
deterministic cause/Aggregate tree. This package performs no console, file,
network, retry, batching, or persistence work.

`describeNonFiniteNumber()` owns the canonical `nan` /
`positive-infinity` / `negative-infinity` diagnostic representation used by
NodeBraid packages.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@nodebraid/diagnostics' typecheck
bun run --filter '@nodebraid/diagnostics' test
bun run --filter '@nodebraid/diagnostics' build
```

## License

[MIT](./LICENSE)
