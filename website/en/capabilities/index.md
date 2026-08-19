---
title: Capability Map
description: Understand CFlow's five current capability families and package composition from a developer's perspective.
---

# Capability Map

Package boundaries keep dependencies clear, but evaluating a system starts with a different question: “What can it help me build?” CFlow's current workspace packages form five capability families. Each family connects contracts, Runtime integration, and optional Providers instead of selling infrastructure packages in isolation.

| Capability family                                         | Question it answers                                                          | Current delivery                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| [Foundations](/en/capabilities/foundations)               | How are capabilities composed, activated, disposed, and diagnosed?           | Core facade, Plugin Host, Diagnostics                    |
| [Graph State](/en/capabilities/graph-state)               | Who owns the Document, and where do Selection and Viewport live?             | Kernel, Kernel Plugin, Session API, Session Plugin       |
| [Execution & History](/en/capabilities/execution-history) | How are behaviors executed and Document Commits undone or redone?            | Command Plugin, History Plugin                           |
| [Layout](/en/capabilities/layout)                         | How is layout computed asynchronously and committed to the current revision? | Layout API, Runtime integration, Dagre, ELK              |
| [Rendering Contract](/en/capabilities/rendering-contract) | How can a rendering backend integrate without polluting core state?          | Renderer API, Renderer Plugin, and SVG Renderer Provider |

## A typical composition

```text
Application
    │ installs
    ▼
Plugin Host
    ├── Kernel Plugin ──▶ authoritative Document
    ├── Session Plugin ─▶ Selection + Viewport
    ├── Command Plugin ─▶ typed behaviors
    ├── History Plugin ─▶ Undo / Redo
    ├── Layout Plugin ──▶ explicit Layout Engine
    └── Renderer Plugin ▶ application-provided Renderer Factory
```

The Plugin Host installs none of these capabilities implicitly, and `@cflow/core` remains a public facade. Each application explicitly decides which Plugins and Providers belong to a Canvas Runtime.

## Next

- Run the smallest Kernel Runtime in the [Quick Start](/en/guide/quick-start).
- Browse every package in [All Modules](/en/modules/).
- Read [Current Status](/en/status) for publication constraints and known gaps.
