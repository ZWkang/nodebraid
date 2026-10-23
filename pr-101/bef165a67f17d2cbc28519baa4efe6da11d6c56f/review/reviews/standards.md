What this change does: Basic Canvas captures all four numeric Interaction policy properties through normal property reads when creating the Plugin. Inherited and non-enumerable values are retained in the owned snapshot instead of being replaced by defaults.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `65b1da44adec388fd586d9806670ce3895972752`
- Tree: `a4c45edaf0ef9ec63f3e0bdeb3ee6e9983adde93`
- Binary patch SHA256: `bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f`

Scope: complete three-dot base-to-head diff, the preset factory and all 159 lines of `numeric-policy.test.ts`. Read the fresh canonical Issue #100 with its complete empty discussion, independent plan and fixture-correction record. Applied current project rules, local workflow, code-review/ponytail-review and relevant principles.

Hard standards: no violations found. The preset captures values; Interaction still validates them, consistent with ADR0066 and Boundary Discipline. Each known property is read once with its original receiver. Connection remains the first capture and its nested snapshot logic is unchanged. Unknown enumerable fields remain available to existing Interaction validation. Default/undefined handling, Renderer configuration identity and lifecycle ownership remain intact.

Traced Examples → Composition → Interaction normalization → wheel/pan → Session → Renderer observation, plus readiness/rollback cleanup. The public tests use real Host/Runtime services and an explicit Renderer backend fixture; they do not claim native browser input. Original getter failures are checked by strict object identity.

Judgment checks: no concrete Fowler smell found. For one isolated Host per Canvas, the existing small snapshot helper is the correct owner. The change adds no validator, interface, dependency, fallback, new policy or speculative abstraction.

Actual independent check: `bun test packages/preset-basic/tests` passed 47 tests / 147 assertions at this head. It covers all four invalid policies across enumerable/inherited/non-enumerable properties, effective zoom/drag behavior, one-time capture across mutation and fresh Hosts, original errors, Connection and existing lifecycle controls. Raw output is saved in `standards-tests.log`.

Also verified exact head/tree/base, full saved patch bytes/hash, prepared-task/inspection binding, clean worktree and `git diff --check`. Implementer red/green and affected results were not relabeled as independent execution.

Not checked independently: typecheck/builds, browsers, full engineering gate, live GitHub refresh, current-head CI, publication or merge.

Verdict: passed. Looks good. Ship.
