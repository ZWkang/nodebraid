What this change does: preserves declared Layout capability values when they are inherited or non-enumerable. The helper still copies enumerable metadata and owns a shallow frozen shell.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `d1924090cd37125c9955ebfe869e8e0e974d0776`
- Tree: `1590be6c815c785a35b2755ad0532aecc193c46a`
- Binary patch SHA256: `6bcbb10f76f389ffc3a2cdeb30b5f3544c02787e280dbff6020cc6126e834342`
- Task digest: `78e4d4e2ec9c37ff55c487cd2c78900a462bd8c3534f0a961853f4836bcedeb9`

Re-read the complete base-to-head patch, both commits, all 253 test lines, saved Issue128/empty discussion and independent plan. Traced current Input, capability validation, helper, Proposal ownership, Runtime, concrete Dagre/ELK and real Command/History integration. Canonical saved patch, clean checkout and source identities passed independent checks before/after testing. Earlier Standards evidence remains unchanged.

Hard documented standards: no remaining violation found. ADR0026 ownership is established at the helper: the source is captured once, enumerable copying runs first, and only absent declared flags are subsequently read. Values and original receivers are retained without defaults, coercion or freezing caller metadata. Unsupported features still fail before computation. Cancellation, Proposal validation, live revision checks and one-Transaction/net-zero behavior remain unchanged.

The previous P2 is closed. Both Error-object cases now assert the actual caught value with `toBe(original)`; the shared helper also checks didThrow, so an absent throw cannot masquerade as `throw undefined`. The fixture-constant assertion is removed. This now tests ADR0029 and `principle-test-behavior-not-implementation` directly.

Judgment-only Fowler smells: no concrete finding. Ponytail: correctly owned, safe and lean for isolated Canvas Engines; the shared test assertion removes real duplication without another production abstraction.

Independent `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests tests/layout-providers.test.ts` exited 0: **154 tests, 1025 assertions**. Full raw output is retained.

Risk: **medium**, under deployed `pr-risk` and its public-source floor. This changes capability acceptance across Providers; complete-source review and the fresh public checks support focused human review. Rollback must revert the complete Issue128 delivery: both commits in reverse order, or the complete mapped publication, restoring the base and recreating Engines. No schema migration exists; code rollback cannot undo application Commands already executed.

Not independently run: TypeScript, builds, browsers, affected/full checks, original compiled-six program, remote CI or publication/main acceptance.

**Verdict: passed. Looks good. Ship.** This is not merge approval.
