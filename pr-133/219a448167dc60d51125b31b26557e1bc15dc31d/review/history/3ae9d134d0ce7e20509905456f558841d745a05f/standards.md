What this change does: captures validated Interaction geometry before owning it. It fixes inherited/non-enumerable values, but introduces a Node Drag cache-association regression.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `3ae9d134d0ce7e20509905456f558841d745a05f`
- Tree: `25e17466d4f7a48b540be9711e9dabdb6fe87b24`
- Binary patch SHA256: `0beba21066485b57839adada0ee99e442cea14635f5fcd30cc8c84ba9fd7bf9a`
- Task digest: `931f3d5bf15180095ee77655c8da3308ac84817af0cf9e85a5726b0e509a25d3`

Reviewed the complete four-file patch, all new browser definitions, full Issue132/empty discussion, plan and connected acceptance, DOM journal, effective-state, Hit Test and input paths. Canonical bytes, clean checkout and source identity passed before/after checks.

**Must fix**

1. **P2: associate captured geometry with its Node identity** (`packages/renderer-svg/src/interaction-projection.ts:120–125`).
   Captures follow `for-of`, but the copy reads `capturedPositions[index]` using the caller's `.map` callback index. A canonical [a,b] array whose map supplies indices [1,0] retains the same IDs but swaps their validated positions and baselines. My acceptor probe observed base a=(80,90), b=(280,190), versus head a=(280,190), b=(80,90). The coordinator's public SVG records confirm the same DOM swap: base 2/2 passes, head 0/2, including iterator-produced equivalent clones. This violates ADR0059/0062's accepted per-Node effective geometry. Use the validated semantic NodeId for association; object identity alone misses clones. Preserve traversal/copy order and add these regressions. Otherwise display and Hit Test consume another Node's geometry.

Hard standards otherwise: no further violation found. Reflect copying retains enumerable metadata, descriptors' enumeration checks, receivers and shallow ownership; eager Node Drag versus sequential Point/Viewport/Rect validation remains deliberate. Judgment-only Fowler smells: no additional finding.

Ponytail: the shared boundary is appropriate for isolated SVG Targets; fix the cache association before shipping.

Independent `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-session/tests`: **295 tests, 2167 assertions**, exit 0. The separate acceptor probe confirms the regression; its initial export-stripping SyntaxError was a retained harness failure.

Risk: **medium**, per the public-source floor. This changes visible/effective Renderer state; complete review, public tests and the concrete regression support focused human review. Rollback: revert the complete `3ae9d13` delivery or mapped publication, recreate Renderers and restore Document/Session projections. Code rollback cannot undo application Commands already executed.

Not independently run: browsers, strict TypeScript, product builds, affected/full checks or remote CI/publication.

**Verdict: changes-requested. Fix 1 first.**
