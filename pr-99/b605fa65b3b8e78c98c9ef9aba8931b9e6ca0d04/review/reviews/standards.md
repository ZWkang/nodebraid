What this change does: Layout binds one concrete Engine when its Plugin is created. The name, capability checks and computation keep using that Engine, including after dependency recovery.

Source identity:
- Base: efc9a639f967718ef2e8c199e07d7ba49629a057
- Head: b605fa65b3b8e78c98c9ef9aba8931b9e6ca0d04
- Tree: f5d6e555c7fad38e2ae589234be80e3201db6415
- Binary patch SHA256: 50f0622fe0fe29d74744f01660840841c10ff8d59ccc7fa34fd8d42c0131dc69

Scope: the complete base...head diff, both files and all 140 new test lines. Commits are cca4e7f and synchronization b605fa6. Both merge parents and prepared/inspection identities agree. `complete.patch` matches canonical `git diff --binary BASE HEAD` byte for byte. `complete-full-index.patch` preserves `git diff --binary --full-index BASE HEAD`, with SHA256 a828316f647642fae44ad6c40347533db417be39855496e53e683605b64c876f. I read Issue #98 and its complete one-comment discussion, including the async-fixture correction.

Hard standards: No violations found. ADR0024 and the public Runtime contract require a statically bound Engine. Capturing the object once establishes that identity without changing Command configuration or Engine internals. ADR0026's Request, capability, cancellation, Proposal and live-revision checks stay at their existing boundaries. Getter and computation failures retain their original values under ADR0029.

Judgment-only smells: No concrete finding across the full Fowler baseline. The local alias fixes the shared factory directly, adds no abstraction or fallback, and keeps the compute method's original receiver.

Ponytail assessment: Looks good for isolated Canvas Hosts with asynchronous computation and synchronous commits. I traced Examples, direct/helper Engines, Dagre/ELK, Command registration/disposal, Kernel commits and History replay. Tests cover both substitution timings, a second Activation, receiver identity and original getter failures.

Independent command at this head:
`bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests packages/plugin-history/tests tests/layout-providers.test.ts`

Result: exit 0; 97 tests, 349 assertions. Final identity, clean-status and whitespace audits passed.

Not checked independently: TypeScript, builds, browsers, full engineering check, remote CI, publication or main integration. Earlier execution evidence was not counted as this review's execution.

Verdict: passed. Looks good. Ship.
