# NodeBraid Port Capability and Port-aware Connection

**Status:** accepted

## Goal

Deliver a real Port capability without adding a third Document entity. Node type or domain Plugins contribute Port definitions; Renderer owns Port geometry and hit testing; Interaction owns source/target compatibility, stability checks, and one atomic Create Edge commit. Nodes without Port definitions keep the existing node-level Connection path.

## Public seams

- `@nodebraid/port-api` owns immutable `PortDefinition`, `NodePortSnapshot`, and `PortSnapshot` values.
- `@nodebraid/plugin-port` provides one activation-scoped `portService`, contribution registration, deterministic snapshot resolution, lifecycle cleanup, stable errors, and explicit subscriber diagnostics.
- A Port Contribution is named, synchronous, and pure over the supplied committed Node value. Multiple contributions may apply to one Node; duplicate contribution IDs and duplicate Port IDs on one Node fail explicitly.
- Port definitions contain only a stable local ID and `source | target` role. Business validation frameworks, capacity rules, data typing, and generic registries remain out of scope.
- Renderer Document updates may carry the Port Snapshot for their resulting Document revision. Missing snapshots mean an explicit empty Port capability for direct provider use.
- `ConnectionAnchorIdentity` may contain `portId`; node-level identities omit it.

## Runtime behavior

- Basic Canvas Composition installs the Port capability before Renderer and Interaction.
- Port contribution registration or disposal notifies Renderer first to reset against the current Document and then Interaction to revalidate or reapply its active projection.
- SVG projects Port circles for Nodes with definitions and node-level source/target Anchors only for Nodes without definitions.
- SVG derives source Port geometry on the right edge and target Port geometry on the left edge, evenly spaced by canonical Port ID within each role.
- Port hits precede Node hits and include Node ID, Port ID, role, and World Point.
- Port-qualified Edges resolve exact accepted Port geometry. A missing or role-mismatched definition rejects the whole update before accepted state changes.
- Connection can start from a source Port or node-level source Anchor and finish on a target Port or node-level target Anchor. Self-loops remain invalid; parallel Edges remain allowed.
- The materializer receives exact optional-port Endpoints and returns the complete Edge.
- Create Edge Command revalidates complete Edge/evidence equality, live Nodes, live Port definitions, source/target roles, self-loop, and Edge ID availability inside one synchronous Transaction.
- Source definition loss cancels the Gesture as stale. Target definition loss clears only the candidate. Unrelated Document or contribution changes preserve and reproject the Gesture.

## Verification

- Public value and Runtime seams use Bun tests, package-name imports, declaration isolation, and dry-run package contents.
- Interaction public-seam tests cover node-level and Port connections, exact materializer Endpoints, malformed roles, stale source/target definitions, conflicts, and one-commit behavior.
- Direct SVG tests cover Port projection, canonical geometry, Port hit order, port-qualified Edge geometry, atomic rejection, reset/commit rollback, and node-level behavior without Ports.
- Real Chromium covers source Port down, Preview, target Port up, one Commit, SVG Edge projection, History undo/redo, contribution removal, and the no-Port node-level path.
- Example Application demonstrates a real domain Port Contribution and port-qualified Edge.

## Out of scope

- Port Document entities, serialization, persistence, collaboration, or independent Port identity.
- Generic Tool, Node Type, Renderer Contribution, Effect, or Validation registries.
- Product UI, arbitrary Port shapes, manual Port positioning, capacity, data-type negotiation, DAG rules, routing, self-loop drawing, or default Edge materialization.
- Silent fallback, fake success, mock browser acceptance, retries, or swallowed errors.
