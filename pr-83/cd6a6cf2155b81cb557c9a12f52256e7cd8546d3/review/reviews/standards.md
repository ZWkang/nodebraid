What this change does: Kernel Node and Edge Writers retain the incoming ID accepted by their strict checks. Owned entity copies, Map keys, relation indexes and replayable Change Set evidence use that same identity.

Verdict: passed.

Reviewed identity:

- Base: 01c4827666dbc089a38eec61925030728411fe9d
- Head: 4c8984b04a944811f545afb00d3b6fbcb64dee68
- Tree: 112b395b2f7ffbbcfa17b3c520ec0db83be13187
- Binary patch SHA256: 41f9934066885c572e7f7457f47b6ada9f238cc2556b6cf329483bf9e5a45413

Hard standards: No violations found. The complete three-file patch preserves ADR0009–0012 Kernel ownership, immutable entity shells, opaque data references, revision-bound evidence and Transaction replay. AGENTS.md, CONTRIBUTING.md and Boundary Discipline retain their existing requirements; comparing the updated main confirms that the standards, glossary and ADRs did not change.

Integration review: Read both mechanical merges, the full current product patch and the intervening Runtime diagnostics/Layout production changes. Layout still passes owned, validated positions through Kernel Service Transactions. Runtime diagnostics retains its existing observational interface. Neither introduces another freeze-helper caller or changes EntityWriter contracts. History still replays through the same strict Node/Edge Writers.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The explicit private ID argument carries one accepted value without adding policy or abstraction. Closed/missing-target checks retain precedence; duplicate/mismatch failures precede remaining field reads. Copy errors, final graph validation, net-zero identity, canonical ordering, separate namespaces and replay remain intact.

Connected code checked: current Writer/freezer callers, CanvasKernel publication, GraphIndex, Change Set preflight/application, Kernel Plugin propagation, History replay and Layout submission. Assumed load: synchronous in-process Transactions for an isolated Canvas Runtime.

Actual checks at this head:

- Independently verified commit history, clean tree, exact head/tree and complete binary patch hash; re-read the full new test file and connected code.
- `git diff --check`: passed.
- `bun test packages/kernel/tests`: 70 passed, 0 failed, 280 assertions, including all 12 regressions.

Not checked: current affected consumers, TypeScript checks, builds, browser suites, full engineering gate, remote CI, publication and remote report readback. Earlier-base review and full-check results were not counted as current verification.
