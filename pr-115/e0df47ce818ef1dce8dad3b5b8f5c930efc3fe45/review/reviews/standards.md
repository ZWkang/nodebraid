What this change does: Delete Selection captures its Selection root and both ID collections once, then validates and applies the same owned indexed values. Caller getters or traversal hooks can no longer redirect deletion to another target.

Source identity:
- Base: 3ebb9bf51df19825ce98b3371075885dfa496fdf
- Head: 0399f1d4cdafa6590d188056b4da19de29af60ab
- Tree: 02ef1145bade98ea58045242438cb2dce93c2d4f
- Binary patch SHA256: 3b832f733f227c091bf0a65732ac5be270d953b3a4c4914ad043c3a4df8952fc

Scope: complete base...head diff, both files and all 436 added regression/helper lines. Sole commit 0399f1d, parent, canonical saved bytes and independent prepared/inspection identities agree. Read Issue #114's complete body and empty discussion, plan and original behavioral red/green plus expanded test evidence.

Hard standards: No violations found. Boundary Discipline and ADR0014 place capture in the shared feature handler. Admission remains Selection → Node IDs → Edge IDs → evidence. Native length conversion occurs once and lazy indices expose original read/coercion failures without caller traversal or bulk allocation. Existing NodeId/EdgeId constructors preserve semantic types. Abort, getters/receivers and thrown-value identity retain ADR0029's contract.

The first evidence Snapshot remains the exact original reference under ADR0072. Entity identities, incident closure, unrelated-Commit acceptance, canonical sorting/deduplication and preflight-before-removal are unchanged. Opaque data is neither traversed nor frozen under ADR0012.

Judgment-only smells: No concrete finding across the full Fowler baseline. The one private ID helper serves both actual namespaces. Similar native-index loops in other packages have different validation/error ownership; a cross-package parser is not justified.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced keyboard capture, Command execution, Kernel identity/graph checks, Session pruning and History replay/Baseline with Document integration under ADR0084/0085. Tests prove first-target deletion, retained live Selection, both Node/Edge paths, sparse and native lengths, strict error identity and opaque-data Undo/Redo.

Independent command at this head:
`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

Result: exit 0; 251 tests, 1730 assertions. Confirmed current compiled capture helpers and no subsequent input-root rereads. Final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, complete affected/full engineering gates, remote CI, publication or main acceptance. Evidence Snapshot collection internals remain outside this repair.

Verdict: passed. Looks good. Ship.
