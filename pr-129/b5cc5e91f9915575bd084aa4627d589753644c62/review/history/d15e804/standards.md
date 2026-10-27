What this change does: retains inherited and non-enumerable Layout capability flags in the helper's frozen copy. Existing enumerable metadata and shallow ownership remain.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `d15e80423973e27a7f1619d129093496f3594c0d`
- Tree: `c7d4fd27330252327e95263459adf3bbccdc395f`
- Binary patch SHA256: `7736c03f4664d5d2339f5133cc9308cb3286cfdb9ce9043690c3ea838604ce60`
- Task digest: `78e4d4e2ec9c37ff55c487cd2c78900a462bd8c3534f0a961853f4836bcedeb9`

Reviewed both complete files, all 248 new test lines, Issue128 and its empty discussion, independent preparation and connected Layout Input/Capability/Proposal, Runtime, Dagre/ELK and History paths. Canonical bytes, clean checkout, parent and source identity passed before/after checks.

**Should fix — documented test-contract gap**

1. **P2: assert the actual Error object's identity** (`packages/layout-api/tests/capability-values.test.ts:229`, `:245–247`).
   The new first-error and capability-source tests use `toThrow(first/original)`. An independently executed Bun probe confirms that a different Error with the same message passes this matcher. Line 247 checks the original constant rather than the caught failure. Thus these regressions permit an identity-changing replacement, despite ADR0029 and `principle-test-behavior-not-implementation` requiring the observable failure contract to be tested. Capture the thrown value with an explicit didThrow check, then use `toBe(first/original)`. Otherwise a future wrapper can silently break this promised identity.

No production-standard violation was found. Own enumerable reads still precede absent-flag reads; each declared flag is captured once with its receiver, without coercion/defaults. Runtime validation, cancellation and one-Transaction behavior retain ADR0026. No concrete judgment-only Fowler smell was found.

Ponytail: the production fix is small and correctly owned for isolated Canvas Engines; improve the two assertions before shipping.

Independent `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests tests/layout-providers.test.ts`: **154 tests, 1024 assertions**, exit 0. A separate public-helper/matcher probe exited 0: the helper preserves the original Error, while the matcher accepts a replacement.

Risk: **medium** under deployed `pr-risk`: public framework capability acceptance changes, requiring focused human review. Evidence is the complete patch and checks above, with the stated test gap. Rollback: revert this commit and recreate Engines; no schema migration exists, and code revert cannot undo application Commands already executed.

Not independently run: TypeScript, builds, browsers, affected/full checks, original compiled-six program or remote CI/publication.

**Verdict: changes-requested. Fix 1 first.**
