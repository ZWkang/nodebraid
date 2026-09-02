# `@nodebraid/plugin-port`

Activation-scoped Port capability for NodeBraid. Node type and domain Plugins
register named synchronous contributions; the Service resolves immutable,
canonical `PortSnapshot` values for committed Canvas Snapshots.

Port registrations disappear with their owning Activation. Duplicate
contribution IDs, malformed definitions, and duplicate Port IDs fail explicitly.
The package does not create Document entities, persistence, product UI, or a
generic registry.
