What this change does: The shared requires/provides normalizer rejects missing Binding descriptors through the existing INVALID_DEFINITION path. The complete patch now also verifies that reflection exceptions retain their original object identity.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `52d1b084845d66bdc93c54b9a6c6a3b03ebf2ece`
- Tree: `0c18884e64538f7f35fe06d705b7616fa04ede14`
- Binary patch SHA256: `97060c5f0836d17173abb889d652e2a5e77423273017335d3926a9ef0de4532d`

Scope: the complete three-dot base-to-head diff, including both commits, `plugin-definition.ts` and all 91 lines of `binding-records.test.ts`. Re-read the unchanged Issue #96 and empty discussion/blockers, prepared plan, complete corrected patch and connected normalization/Host contracts. Applied the current code-review, ponytail-review and relevant project principles.

Previous finding closed: `packages/runtime-cordis/tests/binding-records.test.ts:64` now asserts `expect(received).toBe(failure)` after capturing the actual thrown value. The shared matrix covers both fields and all four reflection operations. A replacement Error with the same message, or no exception, now fails this identity assertion. This addresses Test Behavior Not Implementation and ADR0029. Production sources are byte-unchanged from 5bb.

Hard standards: no remaining violations found. The descriptor check precedes value access in the existing shared owner. Plain/accessor/null-prototype/Proxy controls remain; non-enumerable, symbol and forged-token rejection is unchanged. External reflection still has no catch or wrapper. Definition metadata is installed only after normalization succeeds, consistent with ADR0007.

Judgment checks: no concrete Fowler smell found. For per-Canvas Hosts with multiple Plugin definitions, the existing linear normalization remains sufficient. No abstraction, public interface, dependency or fallback was added.

Actual independent checks: resolved new base/head/tree, read complete diff/commit list, matched corrected patch bytes/hash and inspection/task binding, checked clean worktree and `git diff --check`. Read `runtime-identity-corrected.log`, which reports 140 tests / 561 assertions; those tests were supplied evidence and were not independently rerun.

Not checked independently at this head: tests, typecheck/builds, browsers, full gate, CI, publication or merge. Earlier reports and execution logs retain their original identities.

Verdict: passed. Looks good. Ship.
