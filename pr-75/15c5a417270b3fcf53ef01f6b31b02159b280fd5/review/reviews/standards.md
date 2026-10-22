What this change does: Duplicate Selection translates the actual indexed application mappings into owned arrays after capturing each collection once. Caller-owned array methods cannot replace the records validated by the shared Fragment boundary.

Verdict: passed.

Reviewed identity:

- Base: f0e3fc12e3118b9a3b3d9502940b22f516302b13
- Head: 74160ef20e9acf06a032ab0f4171398d6748fee4
- Tree: 761b37081d75d6994d43b54b70b696d7344037b7
- Binary patch SHA256: c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29

Hard standards: No violations found. The full two-file patch follows ADR0073 ownership and exact same-namespace mapping requirements, ADR0077 external-error identity, and the public-regression requirements in AGENTS.md and CONTRIBUTING.md. Structural collection validation remains local; shared Fragment validation still owns mapping coverage, uniqueness and canonical immutable outputs.

New Kernel integration: Re-read the merged ID-capture changes and their callers. Fragment materialization produces frozen entities with ordinary ID properties. Kernel now forwards one captured ID through its freeze helpers, Map keys and touched IDs, preserving matching Change Set identities. Duplicate still performs one Transaction and then updates Session; History replays that evidence through ordinary Transactions. The Clipboard consumer retains the same Fragment/Kernel seam. No public signature or additional policy is required.

Judgment / ponytail: No actionable Fowler smell, correctness, safety, load, speed or testing finding. The translation change remains minimal and preserves original element-read failures, structural Node-before-Edge rejection, native array-like conversion, inherited entries, invalid-hole rejection and hook-free frozen inputs. Existing collision, stale-source, post-Commit Selection, lifecycle and Undo/Redo behavior remains covered. Assumed load: synchronous materialization in one isolated Canvas Runtime.

Actual checks at this head:

- Independently verified complete commit history, clean tree and exact head/tree/hash.
- Verified inspection/prepared-task identity and complete.patch byte-for-byte against the fixed Git diff.
- Read both full changed files, all 201 regression-test lines, refreshed Issue/PR source and empty feedback, and connected Fragment/Kernel/Session/History/Clipboard paths.
- `git diff --check`: passed.
- `bun test packages/plugin-duplicate-selection/tests`: 34 passed, 0 failed, 117 assertions.

Not checked: remaining affected consumers, typecheck, builds, browsers, full engineering gate, current published-head CI, publication or remote report readback. Earlier-head reports and checks were not reused as current acceptance.
