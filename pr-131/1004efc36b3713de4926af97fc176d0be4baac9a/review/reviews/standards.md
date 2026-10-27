What this change does: retains the first declared Connection materializer in Basic Composition's nested snapshot. Inherited and non-enumerable callbacks now reach the existing Interaction validator.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `878aecc6dfd02597016d26e3e3310a323e3974e8`
- Tree: `9d26a37eb77f17d1c7cae4c0e4c1a8a65cf5058d`
- Binary patch SHA256: `577aab23d8747832f7a25239e8f36a548c755ba7ac84da31e0c875b47a77af44`
- Task digest: `b9606e650c81c842e3fa05a8a55b591810f6db4b16fc7fbadcd51a41945af227`

Reviewed the complete two-file patch, all 356 new test lines, full Issue130/empty discussion, independent plan and retained repository tracer red/green. Canonical patch bytes, source identities, clean checkout, parent and whitespace passed independent checks before/after testing.

Hard documented standards: no violations found. Under ADR0066 and Boundary Discipline, Composition preserves the supplied value rather than reinterpreting Interaction policy. Own enumerable copying and reflection failures still occur first; an absent copied callback is then read once with its original receiver. Caller objects stay mutable, while the nested snapshot stays frozen. Unknown fields and malformed/invalid values still reach Interaction's existing validation. Numeric options, child readiness and cleanup retain their previous owners.

Traced Interaction normalization, Connection Gesture completion, the bare materializer invocation, Create Edge Command, Kernel Transaction and History. No new callback binding, default, coercion or lifecycle policy is introduced. The new tests check exact thrown values, first-invalid preservation, fresh Hosts, one materialization/Commit, opaque data identity, Undo/Redo and cleanup.

Judgment-only Fowler smells: no concrete finding. Ponytail: correctly owned, safe and lean for isolated per-Canvas Hosts. The small conditional copy fixes the shared boundary without another abstraction; tests use actual Runtime services and a recording public Renderer seam, not native-browser claims.

Independent command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-history/tests packages/plugin-renderer/tests packages/plugin-session/tests` exited 0: **404 tests, 2748 assertions**. The current compiled nested capture also passed static inspection. Complete raw output is retained.

Risk: **medium** under canonical `pr-risk`: public framework configuration ownership changes which valid callbacks reach live Interaction. The full patch and fresh public checks support focused human review; green tests do not lower the path floor. Rollback: revert the entire `878aecc` delivery to the base and recreate Composition instances. No schema migration exists; code rollback does not undo application Commands already executed.

Not independently run: TypeScript, builds, browsers, affected/full checks, original compiled-six program or remote CI/publication/main acceptance.

**Verdict: passed. Looks good. Ship.** This is not merge approval.
