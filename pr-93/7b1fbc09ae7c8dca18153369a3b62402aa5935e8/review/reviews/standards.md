What this change does: Kernel replay captures beforeRevision and revision once, then uses that same pair for safe-integer, range and adjacency checks and bounded error details.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: d937a3a3b0a45c93350008c49b45ac803c20b81e
- Tree: 0cb449750b82649b86c7cae04a9769f4bbe36ee2
- Binary patch SHA256: 21ac257815c4b059873c6c8fb86691a91b0ab63b8bc883e8c0f58d7a2d805e7a

Hard standards: No violations found in the complete two-file patch. CONTEXT.md defines adjacent Change Set revisions; ADR0011 retains Transaction-based replay and source conflict protection. ADR0029 requires bounded structural details and original external failure identity. Boundary Discipline and Type System Discipline are satisfied by checking captured runtime values rather than trusting annotations or later getter results. AGENTS.md and CONTRIBUTING.md regression requirements are supported by the retained behavioral red and current public tests.

Direction/object guards remain before header access; rejected headers remain before collection reads or writes. Getters retain their receiver, and first-read exceptions propagate unchanged. Actual commit revisions still come from the current Kernel View rather than restoring incoming revision numbers. Collection/record handling, preflight, Writers, final graph validation and History consumption are unchanged.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. Two local values fix the repeated-read decision without another type, abstraction, dependency, cap or fallback. Read the full production change, all 336 test lines and 38 new cases, Kernel applyChangeSet/guard/header/collection/preflight/write paths, commit publication and History replay. Assumed load: synchronous in-process Transactions for isolated Canvas Runtimes.

Discussion/evidence: Original and refreshed Issue92 bodies match; both have no comments. No PR or unresolved human review exists. The retained test-only red shows an invalid first tuple committing instead of throwing; the development-time type error was not counted as a behavioral red.

Actual checks at this head:

- Verified clean tree, complete commit/diff identities, prepared-task/inspection binding and byte-identical complete.patch.
- `git diff --check`: passed.
- `bun test packages/kernel/tests packages/plugin-history/tests`: 132 passed, 0 failed, 546 assertions, including numeric limits, bounded diagnostics, both namespaces/directions, inherited inputs and caught-error atomicity.

Not checked: other affected consumers, TypeScript checks, builds, compiled-package probes, browsers, full engineering gate, current-head CI, publication or remote evidence readback.
