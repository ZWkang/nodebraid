# Node authoring

The `node-authoring` scene opens a fresh production Basic SVG Example. Choose
`Card` from `[aria-label="Node type"]`, activate `[aria-label="Place node"]`
and click blank Canvas through native pointer input. Verify four Nodes, the new
Selection and `[data-example-placement="idle"]`.

Edit `[aria-label="Node label"]` and `[aria-label="Tags (JSON array)"]`. Typing
must leave revision and SVG text unchanged; `Apply changes` commits once. Undo
restores the old label and Redo restores the edited label. Inspect
`[data-example-node-label]` within the new Node outer group.

Choose `Note` and place a second Node. Verify its ellipse content, download a
real Document file, reopen and upload it. The restored graph has five Nodes,
the original Edge, both types and exact edited data, with a fresh History
Baseline. Re-export and compare the complete file.

The collector saves before/created/edited/after images, accessibility snapshots,
the actual source and restored files, action logs and recordings. Detailed draft
switching, invalid fields, stale edits, explicit reload, cancellation, corner
hits and continued editing are covered by
`examples/app/browser-tests/node-authoring.browser.ts`; this preview does not
claim every failure path or all public Command contracts.
