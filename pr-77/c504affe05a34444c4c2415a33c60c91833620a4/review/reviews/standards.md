What this change does: Session validates and publishes owned Viewport fields and indexed Selection values. The incoming array length is converted once before lazy traversal, preventing caller-controlled coercion from hiding IDs.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: f3c41d9f95cefb7f21424ba0b62ad729663fae5d
- Tree: ee6c00bd97da199489fdf439422bd51d699313a5
- Binary patch SHA256: f631def090171fc90bdbb50bd525138000ac9da572ba9afaba61825de6a85068

Hard standards: No violations found in the complete two-file patch. ADR0017 atomic membership checks, ADR0018 finite coordinates/positive zoom and ADR0022 consistent breadth-first notification remain intact. Boundary Discipline and Type System Discipline keep runtime normalization at Session's ownership boundary. Issue aggregation, original read errors, no-op Snapshot identity and disposal remain covered. No public API, input cap, fallback or dependency was added.

New main integration: Reviewed Duplicate's merged indexed-mapping translation and its full path through Fragment materialization, Kernel commit, Session evidence check and setSelection. Fragment supplies frozen ID arrays; Session copies their actual values, checks current Kernel membership and publishes canonically. History retains the original single Document Commit and replays through Kernel; Session changes do not enter History. Renderer and Interaction still observe consistent queued Snapshots.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The private helper serves both ID namespaces without another abstraction. Original length-coercion P2 remains resolved at this identity: the unchanged public probe reads both IDs, performs one coercion, rejects the unknown entity and preserves the Snapshot. Assumed load: an isolated Canvas Runtime with synchronous mutations and reentrant observers.

Actual checks at this head:

- Verified complete history, clean tree, exact head/tree/hash, independent prepared-task/inspection identity and byte-identical complete.patch.
- Read the full current production change, all 323 regression-test lines, refreshed source/feedback and connected callers; diff --check passed.
- `bun test packages/plugin-session/tests packages/plugin-duplicate-selection/tests`: 70 passed, 243 assertions.
- Replayed the original public Host stdin probe: exit 0; coercions=1, indices=[0,1], SELECTION_ENTITY_NOT_FOUND, unchanged=true.

Not checked: other affected consumers, TypeScript checks, builds, browsers, full engineering gate, published-head CI, publication and remote evidence readback. Historical checks and reports were not accepted as current results.
