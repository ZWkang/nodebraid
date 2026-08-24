# NodeBraid Kernel

**Status:** ready-for-agent

## Problem Statement

NodeBraid has a completed Plugin Host substrate, but it does not yet have the renderer-independent graph capability that a Canvas Runtime can compose. Without a Kernel, Node and Edge state would have to be owned by Runtime, Renderer, feature Plugins, or ad hoc application stores. That would create multiple writable authorities, spread graph consistency rules across callers, and leave History and Renderer integrations without one standard committed-change contract.

The Kernel must establish the first real canvas capability while preserving the accepted package direction and “Everything is Plugin” architecture. The pure in-process graph implementation must not depend on Plugin Host, Cordis, RxJS, Renderer, framework adapters, business node types, or the public core facade. A future Kernel Plugin adapter will provide the Kernel as a Runtime Service, but lifecycle composition must not shape or leak into the pure Kernel interface.

The first version needs one reversible behavioral path: create an empty Kernel, add and replace Node and Edge entities inside synchronous atomic Transactions, observe immutable Canvas Views, query one consistent revision, receive entity-level before/after Change Sets, and apply those Change Sets forward or in reverse through the same Transaction seam. Failures, stale replay, invalid graphs, reentrancy, escaped Transaction state, and accidental asynchronous callbacks must remain explicit.

## Solution

Build a deep `@nodebraid/kernel` module with one construction entry point and one stateful `CanvasKernel` interface. Each Kernel exclusively owns one authoritative Document beginning as an empty revision-zero graph. Public reads return a revision-bound Canvas View containing an immutable Canvas Snapshot and a Canvas Query for the same committed revision. Public writes pass through one synchronous `transact` method and a short-lived Transaction Context with strict Node and Edge writers.

Transactions stage changes in a private Draft, allow temporarily incomplete intermediate states, validate only the final graph, and either commit atomically or expose no change. A successful commit increments revision once and returns the exact before View, after View, and Change Set. A net-zero Transaction returns no commit and preserves all current root references.

Change Sets contain one coalesced before/after entry per changed entity. The Transaction Context can apply a Change Set forward or in reverse after verifying that affected entities still match the expected source side. Replay creates a new monotonically increasing revision; it never restores an old revision number or bypasses Transaction validation.

The Kernel defensively owns and freezes NodeBraid-defined graph structures while treating arbitrary Node and Edge `data` as caller-owned immutable values. It maintains deterministic ID-based observation ordering and explicit structural errors without exposing Document stores, Drafts, Maps, indexes, validators, or any implementation-specific adapter seam.

## User Stories

1. As a NodeBraid maintainer, I want a publishable renderer-independent Kernel, so that graph consistency has one stable home.
2. As a NodeBraid maintainer, I want the Kernel to have no Runtime or Renderer dependency, so that package direction cannot be inverted.
3. As a NodeBraid maintainer, I want the public core facade to re-export the Kernel interface, so that common consumers retain one public entry point.
4. As a NodeBraid maintainer, I want internal packages to depend on the Kernel package rather than the core facade, so that the facade remains an outward aggregation layer.
5. As a Canvas Runtime author, I want one Kernel to own one authoritative Document, so that no second writable graph store can diverge.
6. As a Canvas Runtime author, I want a newly created Kernel to contain an empty revision-zero Document, so that startup behavior is deterministic.
7. As a Canvas Runtime author, I want non-empty state to enter through a Transaction, so that every first-version graph change has a Change Set source.
8. As a Canvas Runtime author, I want successful Transactions to return the exact before and after Canvas Views, so that committed state can be propagated without a second read.
9. As a Canvas Runtime author, I want successful Transactions to return the matching Change Set, so that Snapshot and change propagation cannot tear across revisions.
10. As a Canvas Runtime author, I want net-zero Transactions to return no commit, so that observers are not notified about changes that did not happen.
11. As a Canvas Runtime author, I want the Kernel to expose no subscription or Observable interface, so that Runtime remains responsible for propagation and lifecycle ownership.
12. As a Canvas Runtime author, I want reads during a Transaction to retain the pre-commit Canvas View, so that private Draft state cannot leak before atomic commit.
13. As a Command author, I want one synchronous Transaction callback, so that I can group related graph writes atomically.
14. As a Command author, I want asynchronous preparation to happen before a Transaction, so that no Draft is retained across `await`.
15. As a Command author, I want the Transaction Context to query its current staged graph, so that later writes can depend on earlier writes in the same Transaction.
16. As a Command author, I want temporarily missing references or temporary parent cycles to be allowed inside a Transaction, so that only the intended final graph constrains operation order.
17. As a Command author, I want strict add semantics, so that accidentally overwriting an existing entity fails explicitly.
18. As a Command author, I want strict replace semantics, so that replacing a missing entity fails explicitly.
19. As a Command author, I want strict remove semantics, so that removing a missing entity fails explicitly.
20. As a Command author, I want replace to receive both the intended ID and replacement entity, so that changing identity by accident is diagnosed.
21. As a Command author, I want Node and Edge writers grouped under the same three verbs, so that I learn one write vocabulary without a generic patch language.
22. As a Command author, I want no upsert or field patch operation, so that absent, null, and undefined values do not acquire ambiguous update semantics.
23. As a Command author, I want Node deletion to avoid implicit cascading, so that handling connected Edge and child Node entities remains an explicit product decision.
24. As a Command author, I want optional Transaction origin metadata, so that committed work can identify its broad source.
25. As a Command author, I want optional command identity metadata, so that a Change Set can retain the behavior that produced it.
26. As a Command author, I want callback errors preserved as their original values, so that the root failure is not hidden behind a Kernel wrapper.
27. As a Command author, I want an asynchronous callback rejected and rolled back, so that accidental Promise usage cannot commit pre-await mutations.
28. As a Command author, I want nested Transactions rejected, so that commit ownership and revision ordering remain unambiguous.
29. As a Command author, I want an escaped Transaction Context to fail after callback completion, so that callers cannot mutate or query a closed Draft.
30. As a graph consumer, I want Node and Edge identifiers to be distinct branded values, so that the two entity namespaces cannot be mixed accidentally.
31. As a graph consumer, I want explicit Node ID and Edge ID constructors, so that I do not need unsafe type assertions.
32. As a graph consumer, I want empty identifiers rejected, so that diagnostics and references always contain an actual identity.
33. As a graph consumer, I want Node and Edge namespaces to remain independent, so that a Node and an Edge may use the same underlying string without colliding.
34. As a graph consumer, I want an Edge Endpoint to identify a Node and optional Port, so that whole-Node and Port-qualified connections share one representation.
35. As a graph consumer, I want Port existence to remain outside Kernel validation, so that business node semantics do not enter the generic graph model.
36. As a graph consumer, I want Node `type` and Edge `type` to remain opaque strings, so that the Kernel does not require a type registry.
37. As a graph consumer, I want Node and Edge `data` to remain unknown to the Kernel, so that heterogeneous domain Plugins can coexist.
38. As a graph consumer, I want an optional Node parent ID to remain available, so that grouping, containers, and subflows can be represented later without changing the base entity.
39. As a graph consumer, I want a parent ID to reference an existing Node, so that the committed hierarchy is structurally complete.
40. As a graph consumer, I want parent relationships to remain acyclic, so that traversal and containment have a well-defined root structure.
41. As a graph consumer, I want finite Node positions, so that invalid numeric values do not enter Renderer-independent geometry.
42. As a graph consumer, I want finite non-negative Node sizes, so that zero-sized or unmeasured Nodes remain valid without admitting impossible negative geometry.
43. As a graph consumer, I want self-loop policy to remain outside the Kernel, so that domain rules decide whether a Node may connect to itself.
44. As a graph consumer, I want business connection limits outside the Kernel, so that general graph consistency is not coupled to one product.
45. As a read-side consumer, I want one Canvas View to pair a Canvas Snapshot with its Canvas Query, so that they always describe one revision.
46. As a read-side consumer, I want the same Canvas View reference for the same revision, so that adapters can detect real changes by identity.
47. As a read-side consumer, I want old Canvas Views to remain stable after later commits, so that asynchronous work can safely retain a historical observation.
48. As a read-side consumer, I want immutable Node and Edge arrays in the Canvas Snapshot, so that I cannot mutate the Document through a read value.
49. As a read-side consumer, I want direct Node and Edge lookup through Canvas Query, so that I do not need access to internal Maps.
50. As a read-side consumer, I want incoming, outgoing, and incident Edge queries, so that directional and undirected graph behaviors do not rebuild adjacency scans.
51. As a read-side consumer, I want child Node queries, so that containment behaviors do not rebuild parent indexes.
52. As a read-side consumer, I want deterministic ID-based result ordering, so that equivalent Documents produce equivalent observations independent of write history.
53. As a Renderer integrator, I want Snapshot ordering not to imply z-index, so that rendering order becomes an explicit future model rather than an accidental insertion-history contract.
54. As a Renderer integrator, I want unchanged entity references reusable across commits, so that incremental projection can avoid unnecessary work.
55. As a History author, I want Change Sets to contain complete before and after entities, so that undo does not require Command-specific inverse logic.
56. As a History author, I want multiple writes to one entity coalesced, so that one Transaction yields one meaningful change per entity.
57. As a History author, I want add-then-remove and replace-back-to-original sequences omitted, so that History does not record net-zero work.
58. As a History author, I want Change Sets applied through the same Transaction seam, so that undo and redo cannot bypass graph validation.
59. As a History author, I want reverse application to verify the current entity matches the original after side, so that stale undo cannot overwrite later work.
60. As a History author, I want forward application to verify the current entity matches the original before side, so that stale redo cannot overwrite later work.
61. As a History author, I want Change Set source revisions used for diagnostics rather than equality gates, so that undo and redo can create new increasing revisions.
62. As a History author, I want Change Set application to be atomic inside its containing Transaction, so that conflicts never leave partial staged restoration.
63. As a History author, I want replay metadata to come from the new Transaction, so that undo and redo are observable as their own commands.
64. As a maintainer, I want NodeBraid-owned graph structures defensively copied and frozen, so that caller mutation cannot corrupt committed state.
65. As a domain Plugin author, I want the Kernel not to deep-copy or freeze arbitrary `data`, so that domain values are not forced into an undocumented serialization model.
66. As a domain Plugin author, I want `data` compared by reference semantics, so that immutable domain updates remain explicit and predictable.
67. As a maintainer, I want structural graph failures reported with all detected issues, so that debugging does not require one failing run per invalid reference.
68. As a maintainer, I want stale Change Set replay reported separately from malformed Change Set input, so that conflict and contract failures remain distinguishable.
69. As a maintainer, I want revision overflow to fail explicitly, so that a Kernel never emits an unsafe revision value.
70. As a maintainer, I want no hidden retry, fallback, timeout, or fake-success path, so that every violated Kernel contract remains observable.
71. As a test author, I want Kernel behavior tested through the public CanvasKernel interface, so that tests survive changes to Draft, Map, index, or persistence-structure implementations.
72. As a test author, I want deterministic error and ordering contracts, so that tests assert domain behavior rather than implementation timing.
73. As a test author, I want the real Kernel implementation used in tests, so that no fake graph store can disagree with production semantics.
74. As a future Runtime author, I want the Kernel Plugin adapter designed after the pure Kernel interface has implementation evidence, so that lifecycle composition does not pre-shape the graph module.
75. As a future collaboration author, I want local revision documented as a local projection version, so that it is not mistaken for a cross-client version number.

## Implementation Decisions

- Add a publishable `@nodebraid/kernel` module containing the pure in-process Kernel implementation and its NodeBraid-owned public interface.
- Keep the Kernel module free of runtime dependencies. It must not depend on Plugin Host, Cordis, RxJS, Renderer API, a concrete Renderer, framework adapters, business Plugins, or `@nodebraid/core`.
- Re-export the Kernel public interface from the public core facade. The Kernel package must not depend back on the facade.
- Do not add the Kernel Plugin adapter in this specification. The future adapter will depend on the Kernel and Plugin Host seams, provide the Kernel as a Runtime Service, and own its reachability for one Plugin Activation.
- Export one `createCanvasKernel` construction entry point. It creates one stateful CanvasKernel owning one empty revision-zero Document.
- Do not accept initial graph content, Canvas Snapshot, Serialized Document, or restored revision in the first construction interface. Non-empty first-version state is created through Transaction.
- Model the first-version Document with Node, Edge, Edge Endpoint, and local revision only.
- Use distinct branded string types for Node ID and Edge ID.
- Export Node ID and Edge ID construction functions. Reject empty strings, but do not generate IDs or impose UUID, prefix, whitespace, or business formatting rules.
- Keep Node and Edge ID uniqueness in separate namespaces. Equal underlying strings across the two entity kinds are valid.
- Define Point with `x` and `y` finite numbers.
- Define Size with `width` and `height` finite non-negative numbers. Zero is valid.
- Define Edge Endpoint with one Node ID and an optional Port ID string.
- Keep Node fields to ID, opaque type, position, optional size, optional parent ID, and unknown data.
- Keep Edge fields to ID, opaque type, source Endpoint, target Endpoint, and unknown data.
- Retain optional parent ID in the first model for grouping, containers, and subflows.
- Do not introduce a Node Type Registry, Port Registry, generic entity registry, extensions record, schema version, or business Validation system.
- Give each CanvasKernel one exclusive authoritative Document. Do not expose the Document object, internal Maps, Draft, indexes, validators, mutation log, or store handles.
- Expose public committed reads through `read`, returning a Canvas View made from a Canvas Snapshot and Canvas Query for exactly the same revision.
- Keep the same Canvas View, Canvas Snapshot, and committed Canvas Query root references while revision is unchanged.
- Produce a new Canvas View and Canvas Snapshot root only for a successful commit with net changes.
- Keep old Canvas Views stable after future commits. The Kernel does not retain all historical Views itself; external references determine their lifetime.
- Keep Canvas Snapshot arrays readonly and sorted by underlying ID string using deterministic code-unit ordering.
- Sort Query collection results using the same entity-ID ordering.
- State explicitly that array order is observational determinism, not z-index, paint order, user ordering, or insertion history.
- Expose Canvas Query methods for direct Node lookup, direct Edge lookup, incoming Edges, outgoing Edges, incident Edges, and child Nodes.
- Return `undefined` for missing direct entity lookup.
- Treat relationship queries for a nonexistent Node as an entity-not-found structural error rather than silently returning an empty result.
- Return each self-loop once from the incident Edge query even though it is both incoming and outgoing.
- Reuse the Canvas Query method interface in committed Canvas Views and Transaction Contexts. The owner determines whether it reads one committed revision or the current staged Draft.
- Do not expose `getSnapshot` on Canvas Query. A committed Snapshot is obtained from its Canvas View, while a temporary Draft cannot produce a public Canvas Snapshot.
- Expose one synchronous `transact` method on CanvasKernel. It accepts a callback followed by optional Transaction metadata.
- Keep Transaction metadata to optional origin and command ID strings. Metadata describes the new commit and does not control validation or permissions.
- During a Transaction, keep `CanvasKernel.read` bound to the pre-transaction committed Canvas View. Only the Transaction Context can observe staged state.
- Expose one Transaction Context only for the dynamic extent of its callback.
- Group strict Node and Edge writers on the Transaction Context. Each writer supports add, replace, and remove only.
- Make writer operations return no domain result. Callers already own IDs and can inspect staged state through Transaction Query.
- Make add fail immediately when the current staged graph already contains the entity ID in the relevant namespace.
- Make replace fail immediately when the current staged graph does not contain the entity ID.
- Make remove fail immediately when the current staged graph does not contain the entity ID.
- Require replace to receive both the intended ID and complete replacement entity. Fail if the two IDs differ.
- Do not add update, patch, merge, upsert, mutation Draft handles, or field-specific convenience operations.
- Allow temporary missing references, invalid parent relationships, invalid geometry, and parent cycles while the callback is still staging work.
- Validate only the final Draft after the callback completes synchronously.
- Validate final Node and Edge ID uniqueness, Endpoint references, parent references, acyclic parent relationships, finite positions, and finite non-negative sizes.
- Do not validate self-loops, Port existence, business connection rules, entity count limits, layout rules, or domain data.
- Do not perform implicit cascade deletion. Commands must explicitly remove or reparent child Nodes and remove affected Edges in the same Transaction.
- Reject a callback that returns a Promise or another thenable. Roll back all staged changes and expose an asynchronous-transaction Kernel error.
- Reject nested `transact` calls on the same Kernel. If the error escapes the outer callback, roll back the outer Transaction as with any callback error.
- Close the Transaction Context, its Query, and its writers when the callback finishes. Any later use must expose a transaction-closed Kernel error.
- Preserve errors thrown by user callback code as their original values. Do not wrap them in KernelError.
- Permit callers to catch an immediate writer error inside their callback and continue, because a failed strict operation must not partially mutate the Draft.
- Return `null` when the final Draft has no net change. Preserve revision and all committed root references and do not create a Change Set.
- Return a Canvas Commit when net changes commit successfully. It contains the exact pre-commit Canvas View, exact new Canvas View, and matching Change Set.
- Increment revision exactly once per successful commit, starting from zero.
- Keep revision as a non-negative safe integer. Expose an explicit overflow error instead of producing an unsafe value.
- Define Change Set with before revision, new revision, optional origin, optional command ID, and readonly entity changes.
- Define each entity change by entity kind, ID, complete before value or null, and complete after value or null.
- Require at least one side of every entity change to be non-null and require every non-null entity value to match the change ID.
- Coalesce all writes to one entity into its first before value and final after value.
- Represent add followed by replace as null to final, replace followed by remove as original to null, and remove followed by add as original to final.
- Omit add followed by remove, replace restored to original, and remove followed by an identical add because they have no net change.
- Compare Kernel-owned entity fields by value for net-change and Change Set source matching.
- Compare arbitrary Node and Edge data using `Object.is`. A new deeply equal data object is a change; the same data reference is unchanged.
- Sort Change Set entries by entity kind with Node before Edge, then by underlying ID string using code-unit ordering.
- Expose Change Set application only through the Transaction Context, with forward and reverse directions.
- For forward application, require every affected current staged entity to match the source Change Set's before side before applying any target value.
- For reverse application, require every affected current staged entity to match the source Change Set's after side before applying any target value.
- Validate all affected source values before mutating the Draft so a replay conflict leaves no partial staged application.
- Compare only affected entities for replay conflict detection, then validate the complete final Draft at normal Transaction commit.
- Treat the source Change Set revision values as diagnostics and structural validation inputs, not as a requirement that the current Kernel revision equal an old revision.
- Generate a new Change Set and a new increasing revision for undo or redo. Use metadata from the containing Transaction rather than copying the replayed Change Set metadata.
- Validate the runtime structure of a supplied Change Set and distinguish malformed input from a valid Change Set whose source state conflicts with the current Draft.
- Defensively copy and freeze NodeBraid-owned Node, Edge, Point, Size, Endpoint, Canvas Snapshot, Canvas View, Change Set, Graph Change, error-detail, and returned collection structures.
- Do not recursively copy, traverse, compare, serialize, or freeze arbitrary data. Callers must treat data as an immutable value.
- Permit unchanged entity objects to be shared between adjacent Canvas Snapshots and Change Set sides.
- Expose one KernelError class with stable codes for invalid ID, asynchronous Transaction, reentrant Transaction, closed Transaction, existing entity, missing entity, ID mismatch, invalid graph, invalid Change Set, Change Set conflict, and revision overflow.
- Include structured readonly details on structural Kernel errors.
- Report all detectable final graph issues together for invalid graph failure, with deterministic issue ordering.
- Distinguish missing source or target Endpoint, missing parent, parent cycle, invalid position coordinate, and invalid size dimension in graph issue details.
- Roll back fully on callback failure, asynchronous callback, invalid final graph, malformed Change Set that escapes the callback, or an uncaught Change Set conflict.
- Do not publish observers, events, subscriptions, RxJS streams, disposal methods, retries, timeouts, fallbacks, or fake-success behavior in the Kernel interface.
- Treat `read` and direct entity Query as expected constant-time operations.
- Treat adjacency and child Query as proportional to returned result count after internal indexing.
- Permit first-version commit, complete structural validation, Snapshot materialization, and canonical sorting to take up to graph-linear plus sorting cost.
- Keep internal stores, Draft strategy, copy-on-write behavior, indexes, validation traversal, and future persistent data structures replaceable behind the CanvasKernel seam.

## Testing Decisions

- Use the public `createCanvasKernel` and CanvasKernel interface as the primary and nearly exclusive behavioral test seam.
- Exercise the real Kernel implementation. Do not introduce a fake Kernel, fake Document, mock graph store, or adapter test double.
- Assert observable Canvas View, Canvas Snapshot, Canvas Query, Canvas Commit, Change Set, reference identity, and public error behavior rather than internal Maps, Draft logs, indexes, validators, or sort helpers.
- Follow the repository's Bun test runner and mirrored package-test convention.
- Follow the existing Plugin Host precedent of testing a deep module through its public interface.
- Keep the public core facade test as a narrow package-name import and re-export smoke test rather than duplicating Kernel behavior tests.
- Add compile-time coverage for distinct Node ID and Edge ID types, readonly public structures, unknown data, strict writer entity types, and public Change Set types.
- Test that a new Kernel has revision zero, empty canonical arrays, stable Canvas View identity, and no implicit Canvas capability beyond the Kernel.
- Test non-empty graph creation through one Transaction containing two Nodes and one Edge.
- Test add, replace, and remove strict success cases for both entity kinds.
- Test duplicate add, missing replace, missing remove, and replacement-ID mismatch details.
- Test that Node and Edge may use the same underlying ID string without conflict.
- Test empty ID rejection while leaving non-empty formatting unconstrained.
- Test whole-Node Endpoint and Port-qualified Endpoint values.
- Test that Port existence and self-loop policy are not rejected by the Kernel.
- Test optional parent ID, child Query, nested parents, missing parents, direct self-parenting, and longer parent cycles.
- Test that parent deletion without removing or reparenting children fails final validation.
- Test that Node deletion without removing incident Edges fails final validation.
- Test explicit Edge and child handling in the same Transaction succeeds without requiring operation ordering that is valid at every intermediate step.
- Test finite and non-finite position coordinates.
- Test positive, zero, negative, infinite, and NaN size dimensions.
- Test direct lookup success and missing lookup returning undefined.
- Test incoming, outgoing, incident, and child Query results and canonical ID ordering.
- Test that relationship queries for a nonexistent Node fail explicitly.
- Test that a self-loop appears once in incident results.
- Test that Transaction Query observes prior staged writes.
- Test that committed `read` remains on the previous Canvas View while a callback is active.
- Test a successful commit increments revision once and returns exact before and after Canvas View references.
- Test the after Canvas View becomes the exact value returned by subsequent `read` calls.
- Test that old Canvas Views and Query results remain stable after later commits.
- Test add-then-replace, replace-then-remove, remove-then-add, add-then-remove, replace-back-to-original, and remove-then-identical-add coalescing.
- Test net-zero Transactions return null, retain revision, retain root references, and create no Change Set.
- Test Change Set revision and Canvas Commit revision alignment.
- Test deterministic Snapshot, Query, Change Set, and graph-issue ordering independent of Transaction write order.
- Test that ordering is not inferred from insertion history by creating equivalent Documents through different valid write sequences.
- Test forward Change Set application through a new Transaction.
- Test reverse Change Set application through a new Transaction.
- Test that undo and redo create new increasing revisions and new Change Sets.
- Test that replay metadata comes from the new Transaction.
- Test forward and reverse source matching for additions, removals, and replacements.
- Test that stale replay exposes a Change Set conflict instead of overwriting a later edit.
- Test that one replay conflict leaves no partial staged replay changes.
- Test malformed Change Set structures separately from valid conflicting Change Sets.
- Test that Change Set application can coexist with other staged writes and only the final graph is structurally validated.
- Test Node-before-Edge and ID-based Change Set ordering.
- Test defensive copying by mutating caller-owned Node, Edge, Point, Size, and Endpoint containers after submission.
- Test runtime freezing of Kernel-owned returned structures and readonly collections.
- Test unchanged entity reference reuse where the interface permits it without requiring a particular internal storage strategy for changed entities.
- Test that the Kernel does not freeze arbitrary data and that data reference replacement is observed as a change.
- Test that a new deeply equal data object is a change while the same data reference with otherwise equal Kernel fields is not.
- Test callback error rollback and original error identity preservation.
- Test an async callback that stages work before its first await still rolls back and fails explicitly.
- Test generic thenable rejection, not only native Promise rejection.
- Test nested Transaction rejection and outer rollback when the error escapes.
- Test that an outer callback may catch a reentrancy or strict-writer error and continue from the unchanged staged state.
- Test escaped Transaction Context, Query, and writer usage after success, no-op, callback failure, and validation failure.
- Test that final invalid graph failure returns all detectable issues in one deterministic readonly collection.
- Test that no failed or net-zero path changes revision, Canvas View identity, or committed Query results.
- Use a focused internal revision-increment test only for safe-integer overflow, because the public empty revision-zero seam cannot practically execute enough commits to reach that boundary. Do not expose a test-only public constructor or revision setter.
- Verify generated declarations contain no Cordis, RxJS, Renderer, DOM, framework, or `@nodebraid/core` imports from the Kernel package.
- Verify the Kernel package can build, typecheck, test, and pack independently through root-managed workspace scripts.
- Verify packed output contains only intended public artifacts and package metadata.
- Run repository lint, typecheck, format check, tests, build, diff whitespace checks, package-name import probes, declaration checks, and package dry-run packing before completion.

## Out of Scope

- Kernel Plugin adapter implementation, Kernel Runtime Service token, Canvas Composition, or Plugin Installation lifecycle ownership.
- Changes to Cordis behavior or the existing Plugin Host interface.
- Runtime observers, RxJS streams, events, subscriptions, Renderer Host propagation, or Session State.
- Command registry, Command scheduling, asynchronous Command preparation, or product command policy.
- History stack storage, grouping, merge policy, undo selection, redo invalidation, or user-facing History commands.
- Initial graph construction input, Canvas Snapshot hydration, Serialized Document, schema version, migrations, persistence, import, export, or reset.
- JSON-safe, structured-clone, or deep-freeze requirements for arbitrary data.
- Development-only arbitrary-data mutation diagnostics.
- Node Type Registry, Port Registry, business Validation registry, domain schema, or plugin-owned Document extensions.
- Port as a top-level entity or validation that a referenced Port exists.
- Automatic cascade deletion, automatic child reparenting, business connection policy, self-loop policy, or entity count limits.
- Field patch, partial update, merge, upsert, arbitrary Draft access, public Graph Operation arrays, or a top-level restore write path.
- Async Transaction, nested Transaction, hidden retry, timeout, fallback, compensation, or effect journal.
- Layout, Edge routing, spatial-index public contracts, snapping, geometry measurement, or Viewport transforms.
- Selection, hover, pointer, drag preview, connect preview, or other transient interaction state.
- Renderer API, concrete Renderer implementation, DOM or canvas objects, z-index, paint ordering, and hit testing.
- Collaboration, Yjs, CRDT merge authority, remote revision, multi-View sharing, comments, or presence.
- React, Vue, Vanilla, or other framework adapters.
- A default Renderer, preset, or ready-to-use Canvas Runtime.

## Further Notes

- The public CanvasKernel interface is the agreed test seam. The user explicitly confirmed the revision-bound Canvas View, synchronous Transaction callback, unknown data contract, grouped strict writers, empty initial Document, deterministic ID ordering, Change Set replay within Transaction, structured error behavior, immutable Kernel-owned structures, and source-matched replay before requesting this specification.
- Optional Node parent ID remains in the first graph model. It represents grouping, containers, and subflows; it is not a Renderer scene-parent reference and does not trigger cascade behavior.
- The staged Transaction Query and committed Canvas View Query share one method interface, but they have different owners and lifetimes. The committed Query is revision-bound; the staged Query closes with its Transaction Context.
- “Everything is Plugin” applies when Canvas capabilities are composed into a Canvas Runtime. It does not require the pure Kernel implementation to depend on Plugin Host. The accepted architecture records the future adapter outside the Kernel seam.
- Earlier target-architecture examples that used patch-shaped changes, top-level source or target Port fields, Document extensions, or publicly exposed Maps do not define this first-version interface.
- Local revision is a monotonic version of one Kernel projection. It is not a persistence schema version or a cross-client collaboration clock.
- The repository currently has no Kernel implementation to preserve. The existing Plugin Host package and its public-seam tests are the closest engineering precedent.
- The specification deliberately fixes externally observable behavior while leaving Draft representation, maps, adjacency indexes, hierarchy indexes, copy-on-write strategy, validation traversal, caching, and future persistent collections behind the Kernel seam.
