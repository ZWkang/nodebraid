What this change does: retains the first Endpoint port value for both optional-property presence and the frozen Endpoint copy.

- Base: `b58f1b17ab5ce3d64780c329cf0af1703b86a4e3`
- Head: `7c80696d1b8aa54233c89842fff15b6bfddd9575`
- Tree: `3f189e61617cd7e4d8d2fc061cc7bb91aae3563e`
- Binary patch SHA256: `b96e04e2723786126efa08e85ff053cb50fb14d78cd2a9ed2033090bf6d5a839`
- Task digest: `59f00ccdd1514770dae1c9b2249b46f68e7a1fd6d27d9da325ba13da892b022c`

Reviewed the complete two-file diff, including all 263 new public-test lines; the complete Issue120 request, empty discussion, independent plan and retained red/green evidence. Canonical `git diff --binary BASE HEAD` matches `review.patch` bytewise. HEAD, tree, sole parent, task identity, clean checkout and `git diff --check BASE HEAD` were independently verified.

Hard documented standards: no violations found. Node-before-port and source-before-target reads remain ordered; undefined stays omitted and empty strings remain present. Raw getter failures retain identity and occur before opaque-data reads or Draft Map/index/touched mutation. Direct add/replace guards, Snapshot queries, net-zero replacement and transactional replay preserve ADR0010/0011; opaque data retains its reference under ADR0012, and external failures follow ADR0029. Tests exercise observable Kernel behavior and exact thrown values, consistent with `principle-test-behavior-not-implementation`.

Judgment-only smells: no concrete finding across the Fowler baseline. The shared private copying owner fixes the repeated read without new Port policy, abstraction or dependency.

Ponytail assessment: correct, safe, tested and lean for an isolated Canvas Kernel. Traced shared Writer add/replace, graph/index validation, replay preflight/application and History, Document, Interaction and Core consumers. The current compiled Endpoint helper also contains one ordered read per field.

Independent execution: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/document/tests packages/plugin-interaction/tests packages/core/tests` exited 0: **660 tests, 4097 assertions**. Full original output is retained in `standards-tests.log`.

Not independently checked: TypeScript, builds, affected/full engineering checks, browsers, remote CI, publication or main acceptance. Coordinator results are not counted as reviewer execution.

**Verdict: passed. Looks good. Ship.**
