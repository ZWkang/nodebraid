What this change does: Duplicate Selection captures each mapping collection once and translates its actual indexed entries into owned arrays. Application array hooks cannot substitute valid mappings for invalid input before shared Fragment validation.

Verdict: passed.

Reviewed identity:

- Base: 01c4827666dbc089a38eec61925030728411fe9d
- Head: 7eebf6bf122781d5269e683ddc84c09d39fe2d5d
- Tree: 67473f3965387e5d2f58d8aa74bb1330517becb0
- Binary patch SHA256: c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29

Hard standards: No violations found in the complete two-file patch. ADR0073 requires owned outputs and exact, fresh same-namespace mappings; ADR0077 preserves materializer and unknown failure identity. The translator now owns traversal while shared Fragment validation continues to own mapping validity, coverage and canonical output. This follows Boundary Discipline without changing public contracts or dependencies.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. Captured collections preserve structural Node-before-Edge rejection. Native Array.from operates on an owned length descriptor, avoiding input map/iterator/constructor/species hooks while reading actual indexed values. Original indexed exceptions propagate. Sparse invalid entries reject, inherited entries remain usable, and frozen mappings work. The existing shared validator and Transaction/Selection lifecycle remain in place.

Connected code checked: factory normalization and registration, materializer translation, Fragment capture/materialization and its indexed helper, Kernel writes, Session publication, History replay and the Clipboard consumer of shared Fragment validation. Current Runtime diagnostics and Layout integration do not change these interfaces. Assumed load: synchronous materialization within one local Canvas Runtime.

Actual checks at this head:

- Verified commit history, clean tree, exact head/tree/hash, inspection.json and prepared-task identity. Saved complete.patch matches the fixed Git diff byte for byte.
- Read both complete changed files, including all 201 regression-test lines, plus the supplied Issue/PR snapshots and feedback record.
- `git diff --check`: passed.
- `bun test packages/plugin-duplicate-selection/tests`: 34 passed, 0 failed, 117 assertions, including all 11 new regressions.

Not checked: remaining affected consumers, typecheck, builds, browsers, full engineering gate, remote CI, publication and remote report readback. Prior-head receipts and historical PR evidence were not counted as current verification.
