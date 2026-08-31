# Interaction v4: Duplicate Selection

Duplicate Selection is a public, independently installable NodeBraid Behavior Plugin. It owns the input-free `selection.duplicate` Command, synchronous ID materialization, one Kernel Transaction, and the resulting Session Selection. A sibling Shortcut Plugin contributes focused Ctrl/Cmd+D through the single Interaction input authority.

## Behavior

- Copy exactly selected Nodes and every Edge whose Endpoints are both selected. Edge-only and empty Selection are no-ops.
- The application synchronously maps every source NodeId and internal EdgeId to exactly one unused same-namespace ID. NodeBraid owns scope and entity construction; no Canvas Fragment is public.
- Preserve Node type, size, and opaque data reference. Add one finite world-space offset, default `{ x: 24, y: 24 }`.
- Remap a copied child to its copied direct parent; otherwise preserve the original parentId. Do not copy unselected descendants.
- Preserve Edge type, opaque data, ports, self-loops, and every parallel Edge. Do not copy boundary-crossing Edges.
- Map only original Selection members into the result Selection; internal Edges copied only for graph completeness remain unselected.
- Capture current Selection and Canvas View in the Command handler. Reject changed Selection, changed source roots, changed internal Edge roots/closure, and same-value ABA without binding a global revision. Allow unrelated Commits and external incident Edges.
- Create all duplicates in one synchronous Transaction. Success returns `CanvasCommit`; no-op returns `null`.
- After Commit, update Selection only if its captured root remains current. A later Selection wins; the Commit remains and the Command rejects with its committed revision rather than issuing a compensating Transaction.
- History records the Commit naturally. Undo removes duplicates and reconciliation clears Selection; Redo restores Document state without reselecting.

## Shortcut and input control

- `interactionPlugin` provides an Activation-scoped Shortcut registration Service and remains the only Renderer Input authority.
- Shortcut consumers register an immutable physical key code, exact modifier alternatives, and an input-free typed Command. Same accepted input conflicts explicitly.
- Duplicate defaults to Control-only or Meta-only `KeyD`. Repeat, Active Gesture, and capability unavailability are explicit Input Rejections and still prevent the browser default while the Binding is live.
- Binding disposal immediately stops matching, aborts and awaits its active executions, retains reservation until settlement, and restores browser defaults after release.
- Renderer Input Subscription has a synchronous disposition-control phase before its breadth-first behavior phase. A controller may return `{ defaultAction: "prevent" }`; prevent is monotonic, reentrant native Input is controlled before its own handler returns, and malformed values or listener failures do not erase an accepted disposition. SVG applies native `preventDefault()` before surfacing listener errors.

## Public modules

- `@nodebraid/plugin-duplicate-selection`: Command, Behavior factory, Shortcut factory, mapping/config types, and structured errors.
- `@nodebraid/plugin-interaction`: Shortcut value, Service, Registration, arbitration, lifecycle, diagnostics, and Command execution.
- `@nodebraid/renderer-api`: backend-neutral Input Disposition.
- `@nodebraid/renderer-svg`: real browser default-action application.
- `@nodebraid/core`: facade re-exports; `@nodebraid/preset-basic` remains unchanged.

## Errors

- `plugin.duplicate-selection/INVALID_CONFIG`
- `plugin.duplicate-selection/INVALID_MATERIALIZATION`
- `plugin.duplicate-selection/STALE_DUPLICATE`
- `plugin.duplicate-selection/SELECTION_UPDATE_FAILED`
- `renderer/INVALID_INPUT_DISPOSITION`

Application materializer and unknown external failures preserve their original identity. `COMMAND_NOT_FOUND` becomes capability-unavailable only on the input-driven Shortcut path; other rejected Shortcut Commands use the existing Command fault path.

## Verification

- Bun public-seam tests use real Host, Kernel, Command, Session, Interaction, Duplicate, and History Plugins.
- Cover subgraph scope, ID mapping, nested Nodes, ports, self-loops, parallel Edges, stale/ABA, no-op, failures, Undo/Redo, Shortcut conflict, and lifecycle.
- Real Chromium uses the React Router Examples Application and trusted CDP Mod+D to verify `isTrusted`, `defaultPrevented`, Document, Selection, revision, History, Undo/Redo, and default restoration after Binding release.
- Complete package declarations, pack previews, Renderer browser tests, Example check, docs check, root `bun run check`, and two-axis code review.

## Non-goals

navigator.clipboard, Copy/Paste, JSON-safe data, Serialized Document, Persistence, deep cloning, business entity factories, cross-Canvas Clipboard, generic Tool Registry, async Transaction, and collaborative duplication.
