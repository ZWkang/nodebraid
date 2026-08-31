---
title: '@nodebraid/canvas-fragment'
description: Pure in-memory Canvas Fragment values shared by Duplicate and Clipboard.
---

# `@nodebraid/canvas-fragment`

::: warning Package not publicly released
This name describes the current source module boundary; it is not an npm installation claim.
:::

A Canvas Fragment is an immutable, canonically ordered selected-Node induced subgraph: every selected Node, the complete Edge closure between those Nodes, and explicit Edge members from the original Selection. It preserves nested parents, port-qualified Endpoints, self-loops, parallel Edges, and opaque `data` references.

The public interface contains only `captureCanvasFragment()`, `acceptCanvasFragment()`, `materializeCanvasFragment()`, value types, and structured errors. The package does not depend on Runtime, Renderer, React, browsers, or Cordis.

A Canvas Fragment is not a Serialized Document. It defines no persistence schema version, text envelope, deep clone, generic JSON codec, or cross-version compatibility promise. Applications own concrete text representations.
