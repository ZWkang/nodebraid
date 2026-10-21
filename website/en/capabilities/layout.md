---
title: Layout
description: Separate asynchronous layout computation from synchronous Document commits, with an explicit choice of Dagre or ELK Provider.
---

# Layout

The Layout capability family separates "computing candidate positions" from "modifying the authoritative Document" into two steps. `LayoutEngine` only receives an immutable `LayoutInput` and asynchronously returns a `LayoutProposal`; a Runtime Command validates that the Proposal still comes from the current revision before committing all Node positions in one synchronous Transaction.

```text
Canvas View
    │ createLayoutInput
    ▼
Layout Input ──▶ Layout Engine ──▶ Layout Proposal
                                      │ validate + stale check
                                      ▼
                              one Kernel Transaction
```

This boundary makes cancellation, concurrent results, Provider failures, and History behavior visible: Layout never holds the Kernel directly, nor does it create a separate commit for every Node.

## Packages you need

| Role                      | Package                                                 | When you need it                                                                              |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Provider-neutral contract | [`@nodebraid/layout-api`](/en/modules/layout-api)       | Define Engines, Input, Proposal, and capabilities, or compute a Proposal outside the Runtime  |
| Runtime integration       | [`@nodebraid/plugin-layout`](/en/modules/plugin-layout) | Statically bind an Engine to a typed Command and commit its Proposal to the Kernel            |
| Dagre Provider            | [`@nodebraid/layout-dagre`](/en/modules/layout-dagre)   | You need deterministic, whole-canvas layered layout without incremental layout or Fixed Nodes |
| ELK Provider              | [`@nodebraid/layout-elk`](/en/modules/layout-elk)       | You need ELK Layered, or Stress for incremental layout and Fixed Nodes                        |

`@nodebraid/core` re-exports the provider-neutral API and Runtime integration, but it neither depends on nor re-exports Dagre or ELK. Applications must explicitly select a concrete Provider.

## Choosing a Provider

| Capability         | Dagre                                          | ELK                                                                |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------ |
| Full layout        | Supported                                      | Supported                                                          |
| Incremental layout | Not supported                                  | Supported; requires the `stress` algorithm                         |
| Fixed Nodes        | Not supported                                  | Supported; requires the `stress` algorithm                         |
| Self-loop input    | Supported                                      | Supported                                                          |
| Main configuration | Direction, node/edge/rank spacing, and margins | Algorithm, direction, node/layer spacing, padding, and random seed |

NodeBraid specifies neither a default Provider nor a dynamic Layout Registry. A Provider ID is diagnostic information; the real Runtime identity is the Command token that the application creates and owns for that Engine.

## Input boundaries

Layout processes the whole Canvas and requires:

- every Node to have an explicit Size;
- Nodes without a `parentId`;
- Fixed Node IDs that exist and are unique;
- `incremental` mode still computes the entire graph, with current positions serving only as stability constraints;
- Fixed Nodes are a hard constraint that must preserve their absolute World Positions.

Inputs that violate these conditions fail before reaching the Provider. NodeBraid does not guess sizes or lay out only part of the graph.

Ordinary Edges can be mixed with Edges that carry `portId` on either or both Endpoints. Dagre and ELK both lay out the Node topology: Layout Input retains each Edge ID and its endpoint Node IDs without merging parallel Edges. Changing only Port IDs leaves candidate positions unchanged for the same Node topology and configuration. This requires no Port Plugin, reads no Port Snapshot or Contribution generation, and performs no Port existence, role, or definition validation.

The Renderer still computes Port Geometry from Node Geometry and the Port Snapshot. Layout takes no Port side, order, or relative-coordinate input, does not reposition Ports, and promises no port-level crossing optimization. A successful calculation does not replace Port, Interaction, or Renderer validation.

## Commits and concurrency

A valid Proposal must carry the captured source revision and provide exactly one finite coordinate for every input Node. Before committing, the Runtime reads the current Kernel revision again. If the Document has changed, including an Endpoint `portId` edit, the entire Proposal fails with `STALE_PROPOSAL` instead of being automatically rebased. A Port Contribution generation change alone introduces no additional Layout failure condition.

A Layout Command replaces only changed Node positions, preserving all other Node fields, Edges, Endpoints, `portId`, and domain data. It does not write Session state: Selection and Viewport remain unchanged, with no automatic Fit View. Net changes produce one Canvas Commit, one Change Set, and one History Entry for one-step Undo/Redo. Unchanged positions return `null` without advancing revision or history.

## Not included today

- subset layout;
- Edge Routing and waypoints;
- preview, animation, or interactive dragging policies;
- Worker execution, caching, or persistence;
- a dynamic Provider Registry or default Provider;
- nested Nodes or Port-aware geometric layout.

## Verification evidence

The current implementation is verified by provider-neutral contract tests, Proposal and Request validation tests, Runtime stale/cancellation/commit tests, and real end-to-end composition tests for Dagre and ELK. Both Providers enter a real Plugin Host, Kernel, Command, History, and Session through the same `LayoutEngine` seam, verifying Port preservation, one-step Undo/Redo, net-zero behavior, and unchanged Session state without a Port Plugin.
