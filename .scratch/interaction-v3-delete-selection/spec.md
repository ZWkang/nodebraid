# Interaction v3: Delete Selection

Delete Selection extends the existing `@nodebraid/plugin-interaction` public seam. It does not create a package, tool registry, or second Document write path.

## Behavior

- A focused Renderer publishes `key.down`; logical `key === "Delete"` or physical `code === "Delete"` requests deletion. Backspace is not supported.
- Modifiers do not change Delete semantics. Repeated keydown uses the same semantics; after the first successful synchronous Commit reconciles Selection to empty, later repeats are no-ops.
- With no Active Gesture and a non-empty Selection, Interaction captures the Selection and current Canvas Snapshot, then executes one typed Delete Selection Command.
- The Command computes the canonical deletion closure: explicitly selected Edges plus every incident Edge of every selected Node, deduplicated; it deletes Edges before Nodes in one synchronous Kernel Transaction.
- The Command compares only selected target identity and the incident Edge closure with the exact source Snapshot. Unrelated Commits remain compatible. Missing, replaced (including same-value ABA replacement), or newly incident targets fail atomically with `interaction/STALE_SELECTION`.
- Empty Selection is a no-op and creates no revision or History Entry.
- During an Active Gesture, Delete is rejected through the existing Input Rejection diagnostic and does not cancel the Gesture.
- Successful deletion is reconciled by Session's existing Kernel observer and recorded by History. Undo and Redo restore/remove the complete graph change atomically.
- Transaction, Command, dependency, Activation, disposal, and diagnostic behavior follows the existing Interaction lifecycle seams.

## Non-goals

Clipboard, Backspace, confirmation UI, soft delete, business permissions, async Transactions, and a generic editing Tool Registry are excluded.

## Public test seams

- Bun: real Plugin Host with Kernel, Command, Session, Renderer Runtime, Interaction, and History public interfaces.
- Chromium: the real SVG Renderer in the Examples Application, focused before Delete, with observable Node/Edge counts, Selection, revision, Undo, and Redo.
