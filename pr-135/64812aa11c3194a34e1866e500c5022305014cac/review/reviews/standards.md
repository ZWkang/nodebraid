What this change does: preserves original Runtime cleanup trees alongside diagnostic inspection failures. With no ordinary Sink, diagnostic-only inspection is disabled.

- Base: `e282d6291c98deac2fd65879c94b6bf2881ede6b`
- Head: `37d7131df1b2ffff2c37fb83ac4bc3877795e377`
- Tree: `4800054aa64c34564818f5a5533b4e6698a35e32`
- Binary patch SHA256: `3892550546e1ce446f9847dbd0d9c8deb88eced0739335a106cc9f4b71b2b60b`
- Task digest: `613d5f6a05a5231f6d9a41b64cc61b06d6df2e548b60c191145fa259567fa883`

Independently reviewed the current complete three-file patch and all 323 new test lines, full Issue134/empty discussion and new preparation. Read the present Runtime chain plus newly integrated Basic Connection snapshot/tests, Interaction validation, Gesture/Command invocation and Child resource ownership. Canonical saved bytes, parent, clean checkout and exact identities passed fresh before/after checks.

Hard documented standards: no violations found. ADR0004 cleanup still attempts resources in reverse order and explicitly aggregates failures. The terminal catch retains the existing resource tree and the actual inspection failure as separate members, preserving references and stages under ADR0029. ADR0028 ordinary-diagnostics disabling avoids member-read side effects without changing the cleanup rejection or required Fault Reporter behavior.

Installation/Host cached disposal outcomes, terminal status, dependency cleanup and child de-duplication retain their flow. Basic's inherited/non-enumerable materializer ownership remains at its configuration boundary; its readiness, cleanup and genuine Command/History paths compose with the Runtime repair without new policy.

Judgment-only Fowler smells: no concrete finding. Ponytail: correct, safe and lean for bounded application Host lifecycles. The existing terminal boundary contains the fix; no extra abstraction, accessor ban, retry, cap, flattening or success substitute is introduced.

Fresh independent `/Users/zhou/.bun/bin/bun test packages/runtime-cordis/tests packages/diagnostics/tests packages/preset-basic/tests` exited 0: **393 tests, 2773 assertions**. This invocation covers current inspection-failure controls and the new Basic boundary, including configuration rejection, Host isolation, materialization, Undo/Redo and cleanup. Full raw output is retained; older execution counts were not transferred.

Risk: **medium**, under the deployed public-source floor. Cleanup error/observation behavior affects all Runtime consumers; the complete review and fresh public checks support focused human review. Rollback: revert the entire `37d7131` delivery or mapped publication to this base, preserving integrated fixes, and create fresh Hosts. Code rollback cannot reverse completed resource cleanup or application Commands already executed.

Not independently run: strict TypeScript, product builds, browsers, affected/full checks, compiled-four controls or remote CI/publication. This report covers only the pinned comparison. Worktree access has stopped.

**Verdict: passed. Looks good. Ship.** This is not merge approval.
