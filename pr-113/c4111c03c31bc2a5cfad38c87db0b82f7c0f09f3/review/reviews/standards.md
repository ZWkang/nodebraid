What this change does: Delete Selection captures its first evidence Snapshot once and uses that same reference throughout target and incident-Edge checks. A later getter result can no longer replace stale evidence with current state.

Source identity:
- Base: ce74d89ba882374c16174cff1f20a3e6418acc02
- Head: 911cdd05dfb1959c871472ceed11b339fe822b5e
- Tree: 71cbf9c8c0a4c1739fa2385105397d0a5b10e997
- Binary patch SHA256: 41d2c0e8a58bffd5411f10c6c8115c32aacf42b9c4b959b6be5ee2bd4c48eed3

Scope: complete base...head diff, both files, every changed hunk and the full public test/fixture chain. Sole commit 911cdd0, parent, canonical saved bytes and prepared/inspection identities agree. Read Issue #112's complete body and empty discussion, independent plan, original behavioral red/green logs and the separately recorded Selection-fixture correction.

Hard standards: No violations found. ADR0072 requires original target identity; the capture returns the exact Snapshot and retains original Node/Edge references. Input/Selection validation still precedes evidence reads, and evidence validation precedes the empty-selection no-op. Abort, getter receiver and thrown-value identity remain intact under ADR0029. Target/closure preflight still finishes before any removal; unrelated revisions remain allowed.

Judgment-only smells: No concrete finding across the full Fowler baseline. The small helper has one meaningful job: validate and retain the evidence reference at admission. It introduces no generalized parser, copied entity model or new policy.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced keyboard Selection/Snapshot capture, shared Command registration, Kernel identity/incident indexes and atomic removal, Session pruning, and History replay/Baseline under ADR0012/0014/0084/0085. Public regressions exercise Node and explicit/incident-Edge replacement, malformed first evidence, falsey errors, inherited getters, unchanged state and opaque-data replay. The original red demonstrates a wrong successful deletion; the expanded fixture correction preserves original Selection intent before Session pruning.

Independent command at this head:
`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

Result: exit 0; 207 tests, 1014 assertions. Confirmed the current compiled private module contains the capture and no later input.evidence read. Final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, full engineering check, remote CI, publication or main acceptance. Selection and nested-array capture remain outside this change.

Verdict: passed. Looks good. Ship.
