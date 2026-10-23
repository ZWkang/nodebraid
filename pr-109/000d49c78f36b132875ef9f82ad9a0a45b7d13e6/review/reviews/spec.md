# Spec review — Issue #108 / PR #109, synchronized main

**Verdict: passed.** No concrete missing/partial requirement, scope creep, or incorrectly implemented behavior found at this source.

Reassessed the complete feature against [Issue #108](https://github.com/ZWkang/nodebraid/issues/108) and its [accepted scope](https://github.com/ZWkang/nodebraid/issues/108#issuecomment-6365145631). The supplied complete Issue snapshot was refreshed at `2026-10-23T13:32:54.143Z`; requirements and the sole accepted discussion remain unchanged. Repository instructions, domain vocabulary and applicable ADRs are unchanged.

The feature patch is byte-identical to the prior review, but its Kernel dependency changed. I read the complete main delta: `freezeCanvasNode` now captures position, size and parentId once, with new public regression coverage. I traced both affected consumers: Document's independent validation Kernel receives already captured ordinary structures; restore inserts the decoded frozen entities through the live Kernel inside the Baseline Transaction. Neither path relies on repeated getter reads. Opaque data remains the original reference, and graph validation still occurs before commit.

The specification's “failed preparation/Transaction leaves the current graph and existing History unchanged” and “successful net-zero transactions still reset History” remain satisfied. The unchanged History state machine retains exact Commit identity, reentry, caught-up/busy, cancellation and disposal behavior. File download/reopen/upload assertions, continued editing with occupied generated IDs, public exports, bilingual documentation and capability maps remain aligned with the accepted complete-Document scope.

Source identity:

- Base: `a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688`
- Head: `427f91fe383bf619feea2ceeac50646e0e452b58`
- First parent: `dfc2f222167ec342201d253ddf9a7ce17310d742`
- Tree: `992d05a73fc309a7b06c6f7d07bc7dc2700f6081`
- Patch SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`
- Diff: `git diff a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688...427f91fe383bf619feea2ceeac50646e0e452b58`
- Commits: `dfc2f22 feat: save and restore documents`; `427f91f Merge remote-tracking branch 'origin/main' into feat/issue-108`.

Independent current-head check: `bun test packages/kernel/tests/node-owned-values.test.ts packages/document/tests packages/plugin-history/tests packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts` — **137 passed, 0 failed**, exit 0; `spec-contracts.log`. Confirmed refreshed Kernel artifacts contain the new capture implementation. Patch hash and `git diff --check` passed; worktree stayed clean.

Limits: no build, Chromium rerun, full check or remote mutation performed by this reviewer. Prior-head CI/media publication does not verify this head; formal verification, current-head CI and report/media publication/readback remain pending, as does authorized post-merge acceptance. npm release is not claimed.
