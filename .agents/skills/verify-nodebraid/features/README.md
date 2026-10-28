# Examples feature map

These six user paths are implemented by `scripts/collect-preview.ts` against the
production `/basic-svg?lang=en` page. `--all` executes each once in a fresh context.

| Scene | Observable proof |
| --- | --- |
| [Node authoring](node-authoring.md) | Native placement, custom SVG content, Apply/Undo/Redo and a real authored-Document file round trip. |
| [Viewport](viewport.md) | Zoom changes while Document revision stays unchanged; Reset restores 1.00×. |
| [Selection and History](selection-history.md) | Duplicate adds a selected Node; Undo/Redo restores the documented Node counts. |
| [Port connection](port-connection.md) | A source-to-target drag shows Connection Preview and commits an Edge. |
| [Document files](document-files.md) | A downloaded complete graph survives reopening/import, starts fresh History and supports further editing. |
| [Clipboard](clipboard.md) | Native Copy/Paste crosses the actual clipboard boundary and selects the pasted Node. |

This is a verification map of current Examples behavior, not a product roadmap.
Basic SVG also has a manual Auto layout control (Dagre/full/LR). Its browser suite
verifies changed Node positions, unchanged Selection/Viewport, original Port
connections, one-step Undo/Redo, net-zero repetition and a new connection from
moved Ports. The six preview scenes above do not exercise that control; Layout
evidence needs a separate capture of the actual interaction.
It does not cover every Kernel contract, lifecycle failure, Layout provider or
Documentation Site page; those retain their existing tests and checks. Map changes
must follow actual source/behavior and keep scene selection honest.
