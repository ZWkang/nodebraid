---
name: principle-type-system-discipline
description: >
  Apply when designing typed contracts, reviewing function signatures, or parsing
  external input. Express meaningful state distinctions and exhaust variants
  while preserving runtime validation owned by public contract boundaries.
license: MIT
---

# Type System Discipline

- Represent mutually exclusive states with discriminated unions and handle their
  variants explicitly. Prefer the existing authoritative type to a parallel shape
  or an assertion that hides a mismatch.
- Reuse semantic types such as `NodeId` and `EdgeId`. Introduce another brand only
  when preventing a concrete mix-up justifies its constructors and conversions;
  different parameter names alone do not justify branding every primitive.
- Parse untrusted input into the owning model at its boundary. When an existing
  schema owns the shape, derive from it; do not introduce a schema or generator
  solely to satisfy this principle.
- Keep validation of runtime values, typed configuration, and algorithm constraints
  at their documented owners. A TypeScript annotation does not establish that a
  Provider result is current, complete, finite, or valid for a live Document.

Follow [ADR-0026](../../../docs/adr/0026-validate-layout-contracts-at-their-ownership-boundaries.md)
for Layout Request, Provider configuration, and Proposal checks. Type-level
invariants and runtime checks complement each other; verify the distinction
through the existing type checks and public behavior tests.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-type-system-discipline/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
