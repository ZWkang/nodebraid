# @cflow/plugin-interaction

Interaction Runtime Plugin for CFlow Canvas Runtime instances.

The Plugin consumes Renderer Input and Hit Result through the narrow Renderer
Service, owns one Interaction Projection Binding, and writes stable Selection
through Session. Node Drag uses transient Interaction Projection and commits
all final positions through the typed Move Nodes Command in one Kernel
Transaction. Pan, Zoom, and complete lifecycle behavior are added through
later tracer slices.

## License

[MIT](./LICENSE)
