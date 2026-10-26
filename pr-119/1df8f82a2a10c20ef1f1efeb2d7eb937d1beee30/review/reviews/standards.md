What this change does: Document capture validates entities one at a time instead of allocating an output array from the reported length first. An invalid or throwing first entity now exposes its actual failure.

Source identity:

- Base: c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d
- Head: 0255b60bb4e4404328ec4458a4f38ae64f035bc3
- Tree: f7cc6c61b670b49c3d2cfe4079471d7df9adaf58
- Binary patch SHA256: 7486a70010106403bbc66592cf79b9643fea9951e1f27f1e2e656d8afe64d133
- Task digest: da5ad9e49644d693af0cada6b4de12a53849c0d018aa8f9eb9f973fb42100556

Scope: complete base...head diff, both files, the shared helper and all 195 added public test lines. Sole commit 0255b60, parent, prepared/inspection identities and canonical saved `review.patch` bytes agree. Read Issue #118 and its empty discussion, independent plan, approved Issue #108 and both comments, original 12-case observations and behavioral red/green logs.

Hard standards: No violations found. The helper keeps native length conversion and indexed order while allowing the first failure to surface under ADR0029 and Document README's error contract. It adds no length cap, accessor restriction, retry or fallback.

ADR0084's boundaries remain intact: serializer/deserializer use the same owner, complete graph capture and independent Kernel validation still precede data encoding/decoding, and file schema/version checks are unchanged. Codec methods retain their receiver; opaque data and codec-returned references retain ADR0012's contract.

Judgment-only smells: No concrete finding across the full Fowler baseline. The existing private helper serves Nodes and Edges in both directions; replacing its allocation step requires no new layer or cross-package parser.

Ponytail assessment: Correct and lean for a local Canvas file workflow. I traced both public owners through captureGraph, Kernel, codec callbacks, Core exports and Example restore/Baseline consumers. Public tests exercise large virtual lengths safely, malformed entries, exact falsey exceptions, fractional/empty/native conversion cases, ignored caller hooks, normal round trips and unchanged state.

Independent command at this exact head:
`bun test packages/document/tests packages/kernel/tests packages/plugin-history/tests packages/core/tests`

Result: exit 0; 352 tests, 1698 assertions. Current compiled lazy capture, final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, complete affected/full engineering gates, remote CI, publication or main acceptance. Supplied compiled-control execution was not counted as my run.

Verdict: passed. Looks good. Ship.
