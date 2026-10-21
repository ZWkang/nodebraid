# Examples feature map

These four user paths are implemented by `scripts/collect-preview.ts` against the
production `/basic-svg?lang=en` page. `--all` executes each once in a fresh context.

| Scene | Observable proof |
| --- | --- |
| [Viewport](viewport.md) | Zoom changes while Document revision stays unchanged; Reset restores 1.00×. |
| [Selection and History](selection-history.md) | Duplicate adds a selected Node; Undo/Redo restores the documented Node counts. |
| [Port connection](port-connection.md) | A source-to-target drag shows Connection Preview and commits an Edge. |
| [Clipboard](clipboard.md) | Native Copy/Paste crosses the actual clipboard boundary and selects the pasted Node. |

This is a verification map of current Examples behavior, not a product roadmap.
It does not cover every Kernel contract, lifecycle failure, Layout provider or
Documentation Site page; those retain their existing tests and checks. Map changes
must follow actual source/behavior and keep scene selection honest.
