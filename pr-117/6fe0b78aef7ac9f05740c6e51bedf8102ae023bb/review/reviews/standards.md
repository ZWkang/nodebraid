What this change does: Delete Selection captures evidence revision, collection roots and indexed entity references once. Its maps, incident closure and stale checks now use owned arrays containing those original entities.

Source identity:

- Base: c709c10461f04de9489aa5e8a6cf527164d22afc
- Head: 44cb1ba67a358bfdcaaa2f0351cbbca15fc77315
- Tree: 6b39b2cf190d137f8375ca35040e87018be88287
- Binary patch SHA256: adad99b51c4359d7c2a9fda2f3485c37c6706a0e2eff81471be2934481ad8da9
- Task digest: d563922badc7376ce27272edd7e8583e119722f78d2ab8439d0ec461b3b643e7

Scope: complete base...head diff, both files, all changed production lines and 481 added test lines. Sole commit 44cb1ba, parent and prepared/inspection identities agree. The saved `review.patch` matches canonical Git bytes. Read Issue #116, its empty discussion, independent plan, original 12-case discovery and behavioral red/green evidence. The getter-only fixture failure and unchanged-assertion correction were assessed separately.

Hard standards: No violations found. ADR0072's original Node/Edge identity is preserved: only the containing arrays/envelope are copied. No entity is cloned or newly frozen; opaque data is neither traversed nor frozen. The captured revision remains admission evidence rather than a global revision lock. Selection → revision → Nodes → Edges checks, empty-selection validation and first-error order remain intact. Native lazy indexing preserves coercion and original failures under ADR0029 without caller traversal or bulk preallocation.

Judgment-only smells: No concrete finding across the full Fowler baseline. The private array helper has three real consumers: Selection IDs, Nodes and Edges. It shares the traversal decision without adding a public parser or changing entity validation ownership.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced keyboard/direct Command admission, existing Selection capture, Kernel entity/incident identity checks, atomic removal, Session pruning and History/Baseline replay. Tests cover same-value replacement, later-field mutation, valid inherited getters, malformed first values, falsey exceptions, native lengths, unchanged state and opaque Undo data.

Independent command at this exact head:
`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests`

Result: exit 0; 332 tests, 2290 assertions. Current compiled capture, final source identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, complete affected/full engineering gates, remote CI, publication or main acceptance.

Verdict: passed. Looks good. Ship.
