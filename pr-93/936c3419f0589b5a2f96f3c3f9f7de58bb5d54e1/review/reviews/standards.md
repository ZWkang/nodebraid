What this change does: Kernel replay retains the first beforeRevision/revision pair for all checks and error details. This revision combines that header repair with main’s deployed record and entity-shell capture.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `2b54295f82eec2f08f8b0b34a34352c2b5d94e08`
- Head: `baa7147beeed1cfd66eb1aa6ba2670c92cbbcfe3`
- Tree: `16862e6483263a3ac59f39f0c406ad7e984ae1ed`
- Binary patch SHA256: `47bc25a1cd9ad2f5f8baee434d06dfc0ea13ca20fadcb960935600dc0ce6098b`

Hard standards: no violations found. Re-read the complete two-file patch, all 336 added test lines, Issue #92, empty discussion/blockers, independent prepared plan and supplied PR #93 checkpoint. Current AGENTS, CONTRIBUTING, CONTEXT, tracker/discussion rules, review skills and applicable principle guidance match the checked project documents.

Header capture remains after direction/object guards and before changes, record capture or opaque data access. Invalid first values produce bounded details without collection reads; valid first values cannot be replaced later. Original read errors and inherited receivers remain intact. This follows Boundary Discipline and ADR0029. The integrated capture helpers retain structural values while preserving opaque data’s reference and read phase under ADR0012. Whole-set preflight, final graph validation and new local commit revisions preserve ADR0011; pure Kernel validation does not add Runtime observation under ADR0028.

Judgment checks: no concrete Fowler smell found. For one synchronous Kernel per Canvas, two local constants solve the header boundary with constant overhead and no new abstraction or policy. Traced header → collection → owned records/entities → conflict preflight → writer → commit → History, including current Layout consumers.

Independent checks after dependency construction completed: `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts` passed 189 tests / 911 assertions at this head. Both header and record regression suites passed, including Node/Edge, both directions, original errors, caught-conflict atomicity, opaque-data phases and real Dagre/ELK Undo/Redo.

Verified clean head/tree, exact saved patch/hash, task/inspection binding and `git diff --check`. Local parents are the earlier unpublished sync and new main; the separately captured remote append parent remains an ancestor. Prepared compiled Kernel contains both repairs. Commands/raw output are in `standards-command-log.txt`.

Not checked: fresh builds/typecheck, browsers, full engineering gate, live feedback refresh, new-head CI, API publication/tree readback or merge. Earlier reports/results retain their original identities. This report covers independent Standards and ponytail-review only.
