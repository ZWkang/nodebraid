What this change does: Move Nodes captures the caller’s collection, normalized length, indexed entries, Node IDs and Point scalars once. Every validation, stale check and write uses those same owned values.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `ecfd1b0b21617717012ad3070d836c3d3b20c542`
- Tree: `68258a4c6774fd95d27cd7fb44bdfb3fea049b38`
- Binary patch SHA256: `ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4`

Scope: complete three-dot base-to-head diff, the shared Move Nodes handler and all 465 lines of `move-input-values.test.ts`. Read Issue #104 with its complete empty discussion, independent plan, fixture-correction record and current project rules/principles.

Hard standards: no violations found. Capture stays in the feature handler under ADR0014 and Boundary Discipline. Abort precedes input reads. Whole-input shape checking still precedes duplicate/order/finite checks, and all stale sources are checked before writes. The capture preserves Node-ID → basePosition x/y → position x/y order and original external failures under ADR0029.

Length conversion happens once. Native lazy indices avoid caller traversal hooks and eager bulk allocation; BigInt/Symbol errors and first-entry failures remain exposed. Existing semantic NodeId construction uses the already-declared Kernel dependency. Captured Point copies prevent later caller reads from changing admitted evidence or targets. The single Transaction retains current unrelated Node fields/data, metadata, no-op identity and one History entry.

Traced public Command registration/execution, Node Drag caller, capture helpers, Kernel writers and History replay. Other Commands and Gesture/Shortcut policies are unchanged. Tests use real Host/Kernel/Command/History services and an explicit Renderer backend fixture, not native browser input.

Judgment checks: no concrete Fowler smell found. Under one Canvas Host moving a finite selection, copying remains linear in move count and belongs at this owner. No Registry, generic framework, public interface, cap or fallback was added.

Actual independent check: `bun test packages/plugin-interaction/tests packages/plugin-history/tests` passed 99 tests / 479 assertions at this head. Coverage includes stale traversal substitution, read/exception identity, native lengths, sparse and inherited inputs, shape precedence, atomic movement and Undo/Redo. Original command output is in `standards-tests.log`.

Also verified exact revisions, full patch bytes/hash, task/inspection binding, clean worktree and `git diff --check`. Implementer logs were not counted as independent execution.

Not checked independently: compiled reproduction, typecheck/builds, browsers, full engineering gate, live feedback, CI, publication or merge.

Verdict: passed. Looks good. Ship.
