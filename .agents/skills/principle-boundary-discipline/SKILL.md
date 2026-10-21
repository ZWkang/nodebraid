---
name: principle-boundary-discipline
description: >
  Apply when placing validation, error handling or framework adapters.
  Assign each check to the boundary that owns its contract and keep domain
  logic separate from framework wiring.
license: MIT
---

# Boundary Discipline

Place validation where the system accepts responsibility for a value or state.
Keep framework wiring thin and domain transformations independently testable.

- Parse untrusted input at entry points. Expose NodeBraid domain values rather
  than transport or framework representations.
- Identify which component establishes each invariant and which consumers can
  rely on it. Avoid repeating the same established check through the call chain.
- Preserve validation of dynamic facts, revisions, lifecycle state and external
  Provider results. A TypeScript annotation does not establish runtime validity.
- Keep pure calculations separate from resource ownership and error reporting.
  Propagate failures; emit diagnostics at the boundary that handles the failure,
  as specified in [ADR-0028](../../../docs/adr/0028-separate-diagnostics-from-error-propagation.md).

[ADR-0026](../../../docs/adr/0026-validate-layout-contracts-at-their-ownership-boundaries.md)
is a concrete example: Provider configuration, Runtime Proposal validation and
Kernel graph invariants have different owners. Their checks are not redundant
merely because all three components are inside the repository. Before deleting
a check, identify the same guarantee already established at the correct boundary.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-boundary-discipline/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
