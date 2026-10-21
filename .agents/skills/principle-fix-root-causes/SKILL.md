---
name: principle-fix-root-causes
description: >
  Apply when debugging a failure. Reproduce it and trace the first incorrect
  decision or missing handling of a legitimate state before changing code.
license: MIT
---

# Fix Root Causes

The place where a failure appears may only expose a fault created earlier.

- Reproduce through the relevant public interface or real browser scenario.
  Read actual errors and state; instrument when the deciding fact is unknown.
- Trace why the state arose until reaching the first incorrect decision or the
  first failure to handle a legitimate state.
- If the triggering state is legitimate, handling it at its responsible component
  can be the fix. If the state violates the contract, fix its producer rather than
  masking it with retries, clamps, discarded state or swallowed errors.
- Check connected callers for the same proven fault and complete the in-scope fix.
  Do not turn a defect repair into an unrelated repository cleanup.
- Use [TDD](../tdd/SKILL.md) to show the regression fails before the fix and passes
  afterward. Repeated failed fixes with a shared assumption trigger
  [Attack the Premise](../principle-attack-the-premise/SKILL.md).

For restart-only failures, inspect persisted configuration, caches and state as
possible causes rather than deleting them to hide the symptom. Keep the original
failure visible and preserve the established diagnostic and lifecycle contracts.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-fix-root-causes/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
