# @cflow/plugin-interaction

> Documentation: [English](https://zwkang.github.io/cflow/en/modules/plugin-interaction) · [简体中文](https://zwkang.github.io/cflow/modules/plugin-interaction)

Interaction Runtime Plugin for CFlow Canvas Runtime instances.

The Plugin consumes Renderer Input and Hit Result through the narrow Renderer
Service and owns one Interaction Projection Binding. It writes stable Selection
and Viewport through Session, while Node Drag and Edge Connection commit stable
Document results through typed Commands and one Kernel Transaction.

The first interaction slice supports Node, Edge, Port, and Canvas selection;
additive selection; multi-Node Drag preview; primary Canvas, middle-button, and
Space-assisted Pan; pointer-anchored Wheel Zoom; and optional mouse-only,
Node-level Edge Connection through an application-owned Edge materializer. Drag
threshold, Wheel policy, Zoom bounds, and Connection materialization are explicit
readonly Plugin configuration. All pointer-move previews stay outside Kernel and
Session until pointerup.

Each Activation owns one primary Gesture Pointer. Additional Pointers and Wheel
input during a Gesture are rejected through stable diagnostics. Pointer cancel,
lost capture, stale Document or Viewport evidence, unload, and dependency loss
all end the Gesture without committing Preview state. Cleanup releases Input,
Projection, Capture, local state, and both Command registrations as one
failure-preserving lifecycle operation.

## License

[MIT](./LICENSE)
