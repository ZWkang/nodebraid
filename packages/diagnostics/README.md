# @cflow/diagnostics

> Documentation: [English](https://zwkang.github.io/cflow/en/modules/diagnostics) · [简体中文](https://zwkang.github.io/cflow/modules/diagnostics)

Structured errors and Diagnostic Event contracts for CFlow.

```ts
import {
  CFlowError,
  describeDiagnosticEvent,
  describeError,
  describeNonFiniteNumber,
  diagnosticEvents,
  type DiagnosticSink,
} from '@cflow/diagnostics';
```

Every CFlow structural error extends `CFlowError` and exposes a stable
`domain + code` identity with recursively immutable JSON-safe details. User
Callback, Plugin Setup, Command Handler, Provider, and Abort failures remain
their original values.

`DiagnosticSink` receives immutable in-process events. A Sink can use
`describeDiagnosticEvent()` before JSON serialization so raw errors become a
deterministic cause/Aggregate tree. This package performs no console, file,
network, retry, batching, or persistence work.

`describeNonFiniteNumber()` owns the canonical `nan` /
`positive-infinity` / `negative-infinity` diagnostic representation used by
CFlow packages.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@cflow/diagnostics' typecheck
bun run --filter '@cflow/diagnostics' test
bun run --filter '@cflow/diagnostics' build
```

## License

[MIT](./LICENSE)
