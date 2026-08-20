# @cflow/plugin-interaction

Interaction Runtime Plugin for CFlow Canvas Runtime instances.

The Plugin consumes Renderer Input and Hit Result through the narrow Renderer
Service and owns one Interaction Projection Binding. It writes stable Selection
and Viewport through Session, while Node Drag commits all final positions through
the typed Move Nodes Command in one Kernel Transaction.

The first interaction slice supports Node, Edge, Port, and Canvas selection;
additive selection; multi-Node Drag preview; primary Canvas, middle-button, and
Space-assisted Pan; and pointer-anchored Wheel Zoom. Drag threshold, Wheel
sensitivity, and Zoom bounds are explicit readonly Plugin configuration. All
pointer-move previews stay outside Kernel and Session until pointerup.

## License

[MIT](./LICENSE)
