# @nodebraid/plugin-interaction

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/plugin-interaction) · [简体中文](https://zwkang.github.io/nodebraid/modules/plugin-interaction)

Interaction Runtime Plugin for NodeBraid Canvas Runtime instances.

The Plugin consumes Renderer Input and Hit Result through the narrow Renderer
Service and owns one Interaction Projection Binding. It writes stable Selection
and Viewport through Session, while Node Drag and Edge Connection commit stable
Document results through typed Commands and one Kernel Transaction.

The current interaction slice supports Node, Edge, Port, Canvas click selection,
additive Box Selection, multi-Node Drag preview, middle-button and Space-assisted
Pan, pointer-anchored Wheel Zoom, and optional mouse-only Port-aware or
Node-level Edge Connection through an application-owned Edge materializer. Port
definitions come from `@nodebraid/plugin-port`; Interaction validates exact
source/target roles and current definition stability before one commit. Drag
threshold, Wheel policy, Zoom bounds, and Connection materialization are explicit
readonly Plugin configuration. All pointer-move previews stay outside Kernel and
Session until pointerup. Primary dragging from empty Canvas space publishes a
backend-neutral World Rect and selects intersecting Nodes from the current Kernel
View only when the Gesture ends.

While the Renderer owns Focus and no Gesture is active, logical or physical
Delete keydown executes `interaction.selection.delete`. The Command removes
explicitly selected Edges plus every incident Edge of selected Nodes before
removing the Nodes, all in one synchronous Transaction. Selection and source
Canvas Snapshot identity evidence rejects competing target changes, including
same-value ABA replacement, without blocking unrelated Commits. Empty Selection
is a no-op; Backspace is not a Delete alias.

Each Activation owns one primary Gesture Pointer. Additional Pointers and Wheel
input during a Gesture are rejected through stable diagnostics. Pointer cancel,
lost capture, stale Document or Viewport evidence, unload, and dependency loss
all end the Gesture without committing Preview state. Cleanup releases Input,
Projection, Capture, local state, and all three Command registrations as one
failure-preserving lifecycle operation.

## One-shot Node placement

`interactionPlugin` also provides `nodePlacementService`. Install
`@nodebraid/plugin-node-editing` in the same Host so its Create Node Command is
available. The placement Service focuses the Renderer and owns the input routing;
applications do not add a competing DOM or Renderer Input listener.

```ts
const placement = services.placement.begin(({ worldPoint }) => ({
  id: allocateNodeId(),
  type: 'note',
  position: worldPoint,
  size: { width: 180, height: 90 },
  data: { text: '' },
}));

const result = await placement.result;
// result.type is 'created' (with nodeId and commit) or 'cancelled'.
// placement.cancel() only affects this request before its Command starts.
```

A complete primary click on blank Canvas creates once, then returns to ordinary
editing. Entity clicks and movement beyond the existing drag threshold do not
create or run selection/drag behavior, and leave the request armed. Pan and Wheel
Zoom remain available before a candidate click. A Viewport change during that
click invalidates the candidate. Escape, explicit cancellation, replacement and
Activation disposal end the appropriate waiting request; old handles cannot
cancel later requests. There is no following Node preview or Tool Registry.

The application materializer runs synchronously once for an accepted click and
receives a captured world point. Its Node values and schema remain application
owned. A successful Commit is selected only while the request remains current
and no newer Selection has appeared. The pure Create Command does not change
Selection. Cancellation after Command execution starts cannot undo a Commit.

Materialization and pre-commit failures reject `result` with the original error;
cleanup failures remain explicit. Selection or rendering failures after Commit
do not roll back Document or History. A failure occurring after a reentrant
cancellation has already settled `result` is reported through the existing
Fault Reporter as `nodebraid.plugin.interaction.node-placement.fault`.

## Development

Run package scripts from the monorepo root. Public-seam tests also build History
because they verify Delete Undo/Redo with the real Runtime plugins.

```bash
bun run --filter '@nodebraid/plugin-interaction' build:dependencies
bun run --filter '@nodebraid/plugin-interaction' build:test-dependencies
bun run --filter '@nodebraid/plugin-interaction' typecheck
bun run --filter '@nodebraid/plugin-interaction' test
bun run --filter '@nodebraid/plugin-interaction' build
```

## License

[MIT](./LICENSE)
