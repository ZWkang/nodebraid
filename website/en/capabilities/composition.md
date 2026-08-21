---
title: Canvas Composition
description: Assemble a ready-to-use basic Canvas Runtime with an explicit Renderer Factory.
---

# Canvas Composition

CFlow keeps the Plugin Host as an empty substrate. Applications can install Feature Plugins individually or reuse the official Basic Canvas Composition from `@cflow/preset-basic`. Both paths share the same Plugin Graph, Service Tokens, Activations, and resource-disposal semantics.

## Current delivery

The Basic Canvas Composition fixes this member set:

```text
Kernel → Command → Session → Renderer → Interaction → History
```

It accepts an application-selected Renderer Factory and forwards Installation config unchanged to that Provider. The Composition has no SVG, DOM, or concrete-backend dependency. The real SVG example takes a separate explicit dependency on `@cflow/renderer-svg`.

## Readiness and lifecycle

The Composition is an ordinary Plugin. Its parent setup creates every Child Installation and waits for every child to become active, so `composition.whenActive()` is the readiness point for the complete basic Runtime.

Child Services still publish individually through the Plugin Graph; they are not hidden atomically until the parent becomes active. Disposal runs in reverse order: History, Interaction, Renderer, Session, Command, and Kernel. Asynchronous Renderer cleanup is awaited completely, and failures retain the existing AggregateError semantics.

## Decisions the application still owns

- The application creates and disposes the Plugin Host.
- Diagnostics are configured through Host options.
- The Renderer Factory and Provider config are explicit.
- Layout, domain rules, and other capabilities are installed as sibling Plugins.
- Applications that need a custom member set can continue installing the feature Plugins individually.

The Composition provides no aggregate Service, dynamic `getService()`, internal Child Installation handles, default Renderer, or arbitrary Plugin array. Applications consume Kernel, Command, Session, Renderer, and History through static Required Service Bindings.

## Real verification

Package tests use the real Plugin Host and all six real Feature Plugins to verify readiness, Command/History behavior, conflicts, rollback, Host isolation, and asynchronous cleanup. The complete success path uses the real SVG Provider in Chromium to verify projection, Selection, a Move Commit, Undo/Redo, Wheel Zoom, Host disposal, and Target reservation release.

Continue with [`@cflow/preset-basic`](/en/modules/preset-basic), or use the [Quick Start](/en/guide/quick-start) for the headless and real-SVG example layers.
