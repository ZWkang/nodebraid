What this change does: Kernel Node copying retains the first Position, optional Size and parent values supplied to add/replace. Geometry scalars are copied once from their captured shells before final graph validation.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `234a304c34c84b65a24786b48650a294666d892d`
- Tree: `607dd464004b2f845876d7a0f06792cd3a84fb9a`
- Binary patch SHA256: `7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2`

Scope: complete three-dot base-to-head diff, `packages/kernel/src/entity-values.ts` and all 230 lines of `node-owned-values.test.ts`. Read the canonical Issue #102 with its complete empty discussion, independent plan and fixture-correction record. Applied current project rules, local workflow, review skills and applicable principles.

Hard standards: no violations found. Strict Writer ID/availability checks still precede copying. Read order remains type → Position/scalars → Size/scalars → parent → opaque data. The copy completes before Draft Maps or indexes change. Getter failures preserve exact thrown values, including falsy values; inherited receivers and absent optional properties remain supported.

The repair stays in the shared copy owner under Boundary Discipline and ADR0012. It freezes owned shells without copying or freezing domain data. It adds no eager geometry validation: invalid provisional values still reach final graph validation and can be explicitly repaired inside the Transaction. Historical Query/Snapshot/Change Set evidence remains consistent under ADR0010/0011, and original external failures retain identity under ADR0029.

Traced direct Writers, replay capture/materialization, graph/index validation, equality/net-zero coalescing, commit publication and History consumers. Edge copying and Port/data policy are unchanged.

Judgment checks: no concrete Fowler smell found. For one synchronous Kernel per Canvas, local captured values are sufficient. No abstraction, interface, dependency, cap, retry or fallback was added.

Actual independent check: `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts` passed 245 tests / 1339 assertions at this head. This includes Node ownership/error phases, caught-write atomicity, strict IDs, replay, immutable evidence, net-zero and real Dagre/ELK History integration. Raw output is saved in `standards-tests.log`.

Also verified exact revisions, full saved patch bytes/hash, task/inspection binding, clean worktree and `git diff --check`. Implementer checks were not counted as independent execution.

Not checked independently: typecheck/builds, browsers, full engineering gate, live GitHub refresh, current-head CI, publication or merge.

Verdict: passed. Looks good. Ship.
