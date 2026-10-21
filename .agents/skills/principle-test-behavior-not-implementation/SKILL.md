---
name: principle-test-behavior-not-implementation
description: >
  Apply when writing, changing or reviewing a test. Assert observable
  contracts so broken behavior fails while behavior-preserving internal
  changes continue to pass.
license: MIT
---

# Test Behavior, Not Implementation

Use the public seam agreed for the task and the project's [TDD](../tdd/SKILL.md)
and [capability verification](../control-nodebraid/SKILL.md) guidance.

Judge a test against two changes:

- Break the promised behavior: return the wrong result, omit an effect, or perform
  it twice. The test must detect the relevant break.
- Restructure internal code while preserving the same observable contract. The
  test should continue to pass.

Drive concrete input through the caller's interface and derive expected values
from the requirement, not from running the implementation under test. Observe
returned values, public state, documented errors and effects visible to external
systems. Private helper calls and internal collaborator order are not contracts.

The assertion's meaning matters more than its syntax. A public error code or
payload sent to an external service may be contractual; an internal call count
usually is not. For a promised absence of an effect, include a case demonstrating
that the observation can detect that effect when it occurs.

Keep existing valid regressions when refactoring. Avoid tests that merely repeat
wording, constants or data assembled by the test itself. Type-level contract
checks are useful when the public type guarantee is the behavior being verified.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-test-behavior-not-implementation/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
