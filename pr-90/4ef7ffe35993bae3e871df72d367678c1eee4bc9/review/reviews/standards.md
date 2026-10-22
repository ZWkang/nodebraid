What this change does: Layout Runtime checks cancellation immediately after successful Engine computation, before inspecting the resolved Proposal. The existing check after validation remains, protecting against cancellation triggered by Proposal getters.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: 58f3bf4479a5804d3294f83ebd8ea42f76ab644c
- Tree: 1194376ec126ce02cd375aae019e0e4286b2637e
- Binary patch SHA256: 30897c7363497cddaa543f825c64a7a6af564998ce18e2f84082809966616bfe

Hard standards: No violations found in the complete two-file patch. ADR0026 and the public Layout Runtime documentation require cancellation checks around asynchronous boundaries, including directly implemented Engines. ADR0029 preserves Abort reasons and original external errors. The new check uses the existing native signal mechanism without forcing defineLayoutEngine, wrapping failures or changing public contracts.

Both checks are necessary: the first precedes caller-owned Proposal reads; the second handles cancellation during validation. Computation rejection bypasses the new successful-result check and keeps its original failure. Live revision protection, metadata and the single synchronous Kernel Transaction remain unchanged.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. A local awaited result and one signal check repair the owning Runtime boundary without new abstraction, dependency, cap or fallback. Read all 224 new test lines, direct/helper Engine paths, Command signal forwarding and execution settlement, Proposal validation/freezing, stale checks, Kernel writes, lifecycle registration cleanup and actual application/export callers. Assumed load: isolated Canvas Runtimes with asynchronous third-party Engines and concurrent cancellation or Document changes.

Actual checks at this head:

- Independently verified clean tree, commit history, exact head/tree/hash, prepared-task/inspection identity and complete.patch byte-for-byte.
- Read the retained test-only red: direct Engine returned the Proposal getter failure instead of cancellation, while the helper control passed.
- `git diff --check`: passed.
- `bun test packages/plugin-layout/tests packages/layout-api/tests packages/plugin-command/tests`: 69 passed, 0 failed, 169 assertions. All eight new cancellation/control cases pass, including rejected computation, validation-time cancellation, normal single commit and net-zero behavior.

Not checked: other affected consumers, TypeScript checks, builds, browser suites, full engineering gate, current-head CI, publication and remote evidence readback. Targeted results do not establish delivery readiness.
