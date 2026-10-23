What this change does: Create Edge keeps the structural values it validates and uses those values for every Transaction check and the final write. Opaque data stays at the existing Kernel Writer read phase.

Source identity:
- Base: dcf13482b68bc2422fc4d714df1226ab0ef259aa
- Head: 1d1d86af6d647a0ef2ef0b6cd6c6839deb3e8fdd
- Tree: f4a32721d5036a2e22a2c27d2a217eb7db10280e
- Binary patch SHA256: 6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5

Scope: the complete base...head diff, sole commit 1d1d86a, both files, and all 513 lines of the new public regression file. The saved patch matches Git byte for byte. Inspection and prepared-task identities agree. I read the saved Issue #106 request, its complete empty discussion, and the independent plan.

Documented standards: No violations found. The capture boundary preserves shape-check order and original thrown values, as required by Boundary Discipline and ADR0029. The late data getter keeps the original receiver and opaque reference under ADR0012. ADR0069's role, Endpoint, self-loop, Node, Port and duplicate-ID checks still precede the single write.

Judgment-only smells: No concrete finding across the Fowler baseline. Endpoint and Anchor capture have different existing empty-port rules; merging them would erase a real contract difference. The private copies are needed to stop application Port callbacks from changing accepted evidence.

Ponytail assessment: Correct, safe and lean for one isolated Host per Canvas and synchronous Commands. I traced Gesture cleanup/materialization, Command execution, Port definitions, Kernel freezing and rollback, and History undo/redo. Regressions cover inherited and non-enumerable getters, exact error identity, validation order, late data reads and unchanged state on failure.

Independent checks at this head: `bun test packages/plugin-interaction/tests packages/plugin-history/tests` exited 0: 101 tests, 576 assertions. Identity audit and `git diff --check` passed; the checkout stayed clean.

Not checked independently: TypeScript, build, browser rendering, full engineering check, CI, publication or main integration. The Renderer fixture is not visual evidence.

Verdict: passed. Looks good. Ship.
