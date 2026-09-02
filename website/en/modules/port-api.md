---
title: '@nodebraid/port-api'
description: Immutable Port definition and Snapshot values outside the Document.
---

# `@nodebraid/port-api`

::: warning Package is not publicly released
This name describes the current source boundary; it is not an npm installation claim. Use the source checkout in the [Quick Start](/en/guide/quick-start).
:::

`@nodebraid/port-api` defines `PortDefinition`, `NodePortSnapshot`, and `PortSnapshot`, plus read-only query helpers. A Port has a stable local `id` under its owning Node and a `source | target` role. A Snapshot is aligned with one committed Document revision and the current contribution generation.

These values are not Document entities, serialized Ports, or Renderer handles. The Document still stores only optional `portId` values on Edge Endpoints. Runtime registration belongs to [`@nodebraid/plugin-port`](/en/modules/plugin-port); concrete Geometry and hits belong to Renderer Providers.

The package depends only on Kernel identity, not Runtime, Renderer, DOM, Persistence, or `@nodebraid/core`.
