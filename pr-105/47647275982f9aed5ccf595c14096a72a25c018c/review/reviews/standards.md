What this change does: Move Nodes captures the incoming collection, IDs and coordinates once. All validation, stale-position checks and writes then use those private values.

Source identity:
- Base: 58889a92b7cc7a3c953efe115ff6d8664924e094
- Head: d27ee24eaec5add059be9d413b4fcdf347256ab4
- Tree: abd83973678bfdf50b852efdb8c4a77067a75e4b
- Binary patch SHA256: ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4

Scope: complete base...head diff, both files and all 465 new public test lines. Commits c5eedec, 26e6d48 and d27ee24 were inspected. Canonical saved patch bytes, merge parents, independent base, append parent and prepared/inspection digest agree. Read Issue #104, its complete empty discussion and the new plan.

Hard standards: No violations found. Boundary Discipline and ADR0014 keep capture in the shared feature handler. Abort precedes input reads. Whole-input shape checks precede duplicate/order/finite checks; every stale check precedes any write. Length conversion happens once, followed by native lazy indexed traversal. Original failures remain unwrapped under ADR0029, including falsey thrown values. Node fields and opaque data keep ADR0012's ownership boundary.

Judgment-only smells: No concrete finding across the full Fowler baseline. One Point helper serves both Point fields. Sharing it with Kernel/replay parsing would change validation ownership and error timing, so no extra abstraction is justified.

Ponytail assessment: Correct and lean for isolated Canvas Hosts and synchronous transactions. I traced Gesture completion, Command registration, current Kernel copying, Document restoration, History Baseline/recordable-commit handling and the existing Create Edge path under ADR0084/0085. Captured moves remain independent of caller getters while existing canonical order, metadata and no-op behavior remain intact.

Independent checks at this head:
- `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`: exit 0; 191 tests, 916 assertions.
- Separate compiled public-package stdin control: file round trip → Baseline → no-op Move → two-Node Move → Undo/Redo, exit 0. Collection/length/x/y each read once; restored graph, parent/size and opaque Map identities survived replay. This control is additional to the Bun counts.
- Final identity, clean-status and whitespace audits passed.

Not checked independently: TypeScript, builds, native browsers, full engineering check, remote CI, publication or main acceptance. The external Renderer fixture is not browser evidence.

Verdict: passed. Looks good. Ship.
