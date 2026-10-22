What this change does: Basic Canvas captures Interaction.connection once and excludes it from the remaining property copy. The same captured value determines nested copying and is retained for later Child Interaction activation.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: f963eb19fc691ce21a60e92ba3cd6b09042e4c52
- Tree: 1c34b75138a968e79597081f5128f3ee0a59b4b4
- Binary patch SHA256: 3e55c16602f7f28e1bf3c04cb4a8d23949a567c57c04763a7d78665da9e1a528

Hard standards: No violations found in the complete two-file patch. AGENTS.md and CONTRIBUTING.md require public behavioral regressions and original failure exposure; the retained readiness red records the real rejected activation. ADR0066 preserves application-owned Host/Renderer and Child Composition ownership; ADR0068 retains Interaction's single validation/gesture authority. ADR0075/0081 composition boundaries remain unchanged.

Supported inherited and non-enumerable Connection properties are still captured and copied. Absent/undefined Connection retains defaults; malformed values reach Interaction's existing INVALID_CONFIG path. Other property-copy behavior and top-level unknown-option checks remain unchanged. Original Connection getter and Renderer failures retain their identities. No documented valid contract was found to change.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. Object rest removes the repeated external read without adding policy, state or abstraction. Reviewed creation-time normalization, Interaction resolution/runtime use, Child readiness and rollback, reverse cleanup, Core re-export and Examples factory caller. Assumed load: isolated per-Canvas Hosts, including repeated installations from one stable Plugin definition.

Actual checks at this head:

- Verified clean tree, commit history, exact head/tree/hash, prepared-task/inspection identity and complete.patch byte-for-byte against Git.
- Read the full production helper, existing readiness/lifecycle tests and all new readiness additions, relevant ADRs/principles and original source with empty comments/blockers.
- `git diff --check`: passed.
- `bun test packages/preset-basic/tests`: 20 passed, 0 failed, 57 assertions. This includes fresh-Host property controls, defaults, malformed config, asynchronous readiness, Provider conflict/rollback and cleanup failures.

Not checked: broader affected consumers, TypeScript checks, builds, full engineering gate, real browser/Connection Gesture input, current-head CI, publication or remote evidence readback. The existing test Renderer is a public adapter fixture, not browser evidence.
