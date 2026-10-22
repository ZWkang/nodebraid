What this change does: Kernel replay retains validated Graph Change fields and copied Node/Edge structural values through conflict preflight and application. Opaque data remains by reference and is read in its existing comparison or materialization phase.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: 68683f1311543c6f157390d8020b02992efd17e1
- Tree: 38029e5cd73cc7d89d2e3808f6ac774008f2ce70
- Binary patch SHA256: 300b8e7d7b4b8c95b5e1497b0029281e7f935aef23c6768708152b0593011088

Hard standards: No violations found in the complete three-file patch. ADR0010 keeps committed View/evidence consistent; ADR0011 requires whole-set source preflight before replay writes; ADR0012 owns structural shells while leaving domain data opaque. Boundary Discipline and Type System Discipline are maintained: private capture helpers validate runtime values, preserve accepted fields and feed the existing Writers without expanding public exports.

The lazy data property preserves the original receiver and observation phase. It does not leak into committed entities: existing Writer freezing materializes data while copying owned shells. Structural conflicts still reject before opaque data reads when those fields already mismatch. Final graph checks, revision handling, metadata and net-zero coalescing remain at their existing boundaries.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The old structural predicates are replaced at their sole caller rather than duplicated as another public validation layer. Read all changed production code and all 568 regression-test lines, every capture-helper caller, equality/preflight/write paths, GraphIndex, CanvasKernel publication and History replay. Assumed load: synchronous in-process Transactions for isolated Canvas Runtimes.

Discussion/evidence: Original and refreshed Issue89 bodies match and both contain no comments; no PR or unresolved human review is present. The original record and entity-value behavioral red logs were reviewed independently.

Actual checks at this head:

- Verified clean tree, commit history, exact head/tree/hash, independent prepared-task/inspection identity and byte-identical complete.patch.
- `git diff --check`: passed.
- `bun test packages/kernel/tests packages/plugin-history/tests`: 147 passed, 0 failed, 648 assertions. Forward/reverse values, source conflicts, inherited fields, original failures, opaque data, caught-conflict atomicity and History controls pass.

Not checked: other affected consumers, TypeScript checks, builds, compiled-package probes, browser suites, full engineering gate, current-head CI, publication and remote evidence readback.
