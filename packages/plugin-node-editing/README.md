# @nodebraid/plugin-node-editing

Headless Node creation and data editing through the existing Command, Kernel and
History seams. Install `nodeEditingPlugin` with Kernel and Command; Basic Canvas
Composition includes it. The package is also exported by `@nodebraid/core`.

```ts
await commands.execute(createNodeCommand, { node });
const expectedNode = kernel.read().query.getNode(node.id);
if (!expectedNode) throw new Error('Node disappeared.');
await commands.execute(updateNodeDataCommand, { expectedNode, data: nextData });
```

The application supplies IDs, types, geometry and immutable opaque data. Create
adds the complete Node in one Transaction and returns its Commit; it does not
change Selection. Update replaces only data and returns `CanvasCommit | null`.
History records actual changes normally; the same data reference is net zero.

Update requires the exact Node object read when editing began. Any committed
replacement of that Node, including a position change, makes the edit stale;
unrelated Node commits do not. `NodeEditingError` with `STALE_NODE` preserves the
current Document and History. Applications keep their draft, show the conflict
and offer an explicit reload. This is not a field merge or a global revision lock.

Kernel validation, accessor exceptions and cancellation reasons retain their
original failures. Command registrations belong to the Plugin Activation.
Failures in downstream observers or rendering after a Commit do not undo it.

Run `bun run --filter '@nodebraid/plugin-node-editing' test` for real
Host/Kernel/Command/History tests; `build` also validates public declarations and
package-name imports. Packages are not yet published to npm.
