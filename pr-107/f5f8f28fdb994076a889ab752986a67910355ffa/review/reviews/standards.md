What this change does: Create Edge keeps the structural values that passed validation through the final write. Opaque data is still read later by the Kernel Writer with its original receiver.

Source identity:
- Base: aba0795079c6e3182d14b698f212c437092ed844
- Head: 4ecbeb33f7753079be127693fb3c7d2fc55d0e6e
- Tree: 170f9438e1204675c9973a945cb84416c1d454fc
- Binary patch SHA256: 6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5

Scope: complete base...head diff, both files and all 513 new test lines; commits edf10e2 and 4ecbeb3. Canonical saved bytes, merge parents, independent base, append parent and prepared/inspection digest agree. Read Issue #106 and its empty discussion, plus accepted Issue #108 and ADR0084/0085 as integration context.

Hard standards: No violations found. Boundary Discipline and ADR0069's shape, role, Endpoint, self-loop, live Node/Port and duplicate-ID checks keep their order. Data presence remains a shape check; its value remains after every guard. Original exceptions and opaque references remain intact under ADR0029/0012.

Judgment-only smells: No concrete finding across the Fowler baseline. Endpoint and Anchor have different existing empty-port rules, which justify separate capture functions. Private structural copies protect the accepted values from application Port callbacks.

Ponytail assessment: Correct and lean for isolated Canvas Hosts and synchronous commits. I traced Gesture materialization, Command/Port checks, current Kernel copying, Document codecs, Example restore/materializers and History's actual baseline-commit identity handling. Ordinary Edge commits remain recordable after a successful Baseline.

Independent checks at this head:
- `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`: exit 0, 153 tests, 745 assertions.
- Compiled public-package stdin probe, file round trip → Baseline → Create Edge → Undo/Redo: exit 0. Edge root/data were each read once; Undo preserved restored Nodes and Redo retained the opaque Map reference.
- Final identity, clean-status and whitespace audits passed.

Engineering context update: the 2026-10-23 SVG failure remains preserved in `affected.log`. The coordinator's unchanged whole-SVG rerun on 2026-10-25 passed with byte-identical bundles; the subsequent complete `affected-after-svg-investigation.log` run also passed. The original browser/CLI trigger remains unproven, as recorded in `svg-failure-investigation.json`. No source/assertion change, fallback or automatic retry was added. These browser/affected checks were not independently run by this reviewer.

Not checked independently: TypeScript, builds, native browsers, full engineering check, CI, publication or main integration.

Verdict: passed for Standards/ponytail source review. Formal full verification and remote checks remain pending.
