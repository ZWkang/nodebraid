# `@nodebraid/port-api`

Backend-neutral Port value contracts for NodeBraid. A `PortSnapshot` is derived
from a committed Canvas Snapshot and current domain contributions; it is not a
Document entity or serialized Port store.

The package exports immutable value types plus narrow lookup helpers. Runtime
registration belongs to `@nodebraid/plugin-port`, while geometry and hit testing
belong to concrete Renderer Providers.
