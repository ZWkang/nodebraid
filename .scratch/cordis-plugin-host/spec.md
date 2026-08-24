# Cordis Plugin Host

**Status:** ready-for-agent

## Problem Statement

NodeBraid needs a foundational plugin runtime before Kernel, Session, Command, Renderer, Interaction, History, and future canvas capabilities can be composed consistently. The repository currently has only placeholder package code, while the architecture requires every canvas capability to participate in one explicit lifecycle and dependency model.

The user wants Cordis to be the core plugin manager, but does not want Cordis Context, Fiber, Service, effect types, lifecycle states, or version changes to become NodeBraid's public contract. Without a NodeBraid-owned seam, every official and third-party Plugin would be coupled to a prerelease dependency whose lifecycle interface has already changed substantially between major versions.

The plugin runtime must also avoid becoming a loose global registry. Each Canvas Runtime needs an isolated Plugin Host that can explain missing Required Service, reject ambiguous Service Provider combinations, activate and deactivate Plugin Installation instances in dependency order, and release all resources without silent failure.

## Solution

Build a deep `PluginHost` module backed by Cordis. Cordis remains the in-process lifecycle implementation, while NodeBraid owns the public Plugin, Plugin Context, Service Token, Plugin Installation, state, and error contracts.

The Plugin Host starts empty and belongs to one Canvas Runtime. Canvas capabilities are introduced by Plugin Installation instances that statically declare Required Service and Provided Service bindings. A Canvas Composition is itself a Plugin that owns Child Installation instances. This establishes “Everything is Plugin” without pretending that the Plugin Host substrate can install itself.

Plugin setup receives only its statically declared Required Service values, an Activation-scoped AbortSignal, resource ownership, and Child Installation capability. It returns all declared Provided Service values as one result. The Host validates and publishes those values atomically after setup succeeds.

## User Stories

1. As a NodeBraid maintainer, I want Cordis hidden behind a NodeBraid-owned interface, so that Cordis upgrades do not force changes across every NodeBraid package.
2. As a NodeBraid maintainer, I want one Plugin Host per Canvas Runtime, so that plugins and Runtime Service values do not leak across canvas instances.
3. As a Plugin author, I want to define a Plugin without importing Cordis types, so that my Plugin depends only on stable NodeBraid concepts.
4. As a Plugin author, I want to define a strongly typed Service Token, so that consumers receive the correct Runtime Service type without string-key casting.
5. As a Plugin author, I want Service Token identity to be independent of its diagnostic name, so that equal names from unrelated packages cannot collide silently.
6. As a Plugin author, I want to declare Required Service bindings statically, so that missing dependencies are known before my setup code runs.
7. As a Plugin author, I want to declare Provided Service bindings statically, so that Provider conflicts and dependency cycles are detected before activation.
8. As a Plugin author, I want Required Service values exposed as typed local bindings, so that normal service usage is a property access rather than dynamic lookup.
9. As a Plugin author, I want access to undeclared Runtime Service values rejected, so that the declared Plugin Graph remains truthful.
10. As a Plugin author, I want Provided Service values submitted as one setup result, so that dependent plugins never observe a partially initialized Provider.
11. As a Plugin author, I want a setup function with an AbortSignal, so that asynchronous initialization can respond when the Activation ends.
12. As a Plugin author, I want to register Owned Resource cleanup with the current Activation, so that subscriptions, listeners, and external resources are not leaked.
13. As a Plugin author, I want cleanup to run in reverse registration order, so that dependent resources are released before the resources they rely on.
14. As a Plugin author, I want to install Child Installation instances, so that Canvas Composition and future feature composition use the same lifecycle mechanism.
15. As a Plugin author, I want Child Installation instances automatically owned by the parent Activation, so that a parent cannot leave detached children behind.
16. As a Plugin author, I want the same Plugin definition installable more than once, so that each installation can have independent configuration and lifetime.
17. As a Plugin author, I want configuration fixed for one Plugin Installation, so that repeated Activation uses stable inputs and does not introduce mid-flight configuration races.
18. As a Plugin author, I want a failed setup to roll back only that Activation's resources, so that unrelated Plugin Installation instances remain healthy.
19. As a Plugin author, I want setup failures preserved as their original errors, so that debugging does not lose the root cause behind wrapper messages.
20. As a Plugin author, I want failed to be terminal for one Plugin Installation, so that the Host does not create an invisible retry loop.
21. As a Runtime integrator, I want Plugin Installation returned immediately from install, so that I can observe lifecycle state before activation completes.
22. As a Runtime integrator, I want pending state to identify missing Required Service tokens, so that an inactive Plugin is explainable rather than silently waiting.
23. As a Runtime integrator, I want active state to mean that setup completed and all Provided Service values were published, so that consumers can rely on a precise readiness point.
24. As a Runtime integrator, I want failed state to expose its error, so that Plugin activation failures are visible without reading internal logs.
25. As a Runtime integrator, I want disposed state to be terminal, so that stale Plugin Installation handles cannot become active again.
26. As a Runtime integrator, I want stable state snapshot references, so that adapters can subscribe without unnecessary updates.
27. As a Runtime integrator, I want to wait for the next active state, so that Canvas Composition can coordinate Child Installation readiness without reimplementing subscriptions.
28. As a Runtime integrator, I want cancelling one active-state waiter to affect only that wait, so that it cannot accidentally dispose or disable a Plugin.
29. As a Runtime integrator, I want a Required Service consumer to remain pending until its Provider becomes active, so that installation order does not determine correctness.
30. As a Runtime integrator, I want an active consumer to deactivate when a Required Service disappears, so that it never retains a stale service reference.
31. As a Runtime integrator, I want that consumer to activate again when the Required Service returns, so that temporary Provider absence is recoverable.
32. As a Runtime integrator, I want each reactivation to receive fresh Required Service references, a new AbortSignal, and a new resource stack, so that Activation state cannot leak across generations.
33. As a Runtime integrator, I want a Service Token reserved from Provider installation until disposal, so that pending and failed Providers cannot race with replacements.
34. As a Runtime integrator, I want a second Provider for a reserved Service Token rejected explicitly, so that service resolution always has one answer.
35. As a Runtime integrator, I want dependency cycles rejected with the complete Plugin and Service path, so that cycles do not look like permanently pending plugins.
36. As a Runtime integrator, I want dependency-related deactivation ordered before Provider cleanup, so that consumers can release resources while their Required Service is still valid.
37. As a Runtime integrator, I want unrelated Plugin Installation instances allowed to activate concurrently, so that one slow Plugin does not block the entire Canvas Runtime.
38. As a Runtime integrator, I want lifecycle operations for one Plugin Installation serialized, so that setup and teardown cannot overlap unpredictably.
39. As a Runtime integrator, I want Plugin Host disposal to release every Plugin Installation, so that destroying a Canvas Runtime releases all plugin-owned resources.
40. As a Runtime integrator, I want Plugin Host and Plugin Installation disposal to be asynchronous and idempotent, so that multiple owners can safely participate in shutdown.
41. As a Runtime integrator, I want cleanup to continue after individual disposer failures, so that one faulty Plugin does not cause unrelated resources to leak.
42. As a Runtime integrator, I want all cleanup failures reported together as an AggregateError, so that failures are visible without sacrificing complete cleanup.
43. As a Runtime integrator, I want installing into a disposing or disposed Host to fail explicitly, so that a Canvas Runtime cannot be accidentally resurrected.
44. As a Canvas framework author, I want Kernel, Session, Command, Renderer, Interaction, and History to be modeled as Plugins, so that they share one composition and lifecycle system.
45. As a Canvas framework author, I want the Plugin Host to install no hidden base capabilities, so that a Canvas Composition states exactly what a Canvas Runtime contains.
46. As a Canvas framework author, I want the Kernel Plugin to own its Document lifetime, so that destroying the Kernel does not leave a hidden authoritative state behind.
47. As a Canvas framework author, I want persistence and restoration to remain explicit Plugin concerns, so that the Host never silently saves or recovers a Document.
48. As a Canvas framework author, I want official Renderer packages to participate as ordinary Service Provider Plugins, so that no rendering implementation becomes a special core dependency.
49. As a NodeBraid package consumer, I want Plugin Host types available through the public core facade, so that common usage has one public import surface.
50. As an advanced NodeBraid package consumer, I want the Cordis runtime package available separately, so that narrow package imports remain possible.
51. As a test author, I want all lifecycle behavior testable through the public Plugin Host interface, so that tests survive changes to Cordis adaptation internals.
52. As a test author, I want deterministic observable ordering for dependent activation and cleanup, so that race-condition tests do not rely on implementation timing accidents.
53. As a test author, I want no fake Plugin Host or mocked Cordis layer required, so that tests exercise the actual runtime used by consumers.
54. As a maintainer, I want public declaration output free of Cordis imports, so that implementation details cannot leak through generated TypeScript types.
55. As a maintainer, I want Cordis pinned exactly while it is a prerelease, so that dependency installation cannot silently change lifecycle behavior.

## Implementation Decisions

- Add a publishable `@nodebraid/runtime-cordis` module containing the NodeBraid Plugin Host implementation and its NodeBraid-owned public interface.
- Keep `@nodebraid/core` as the public facade and re-export the Plugin Host interface from `@nodebraid/runtime-cordis`.
- Use the npm latest Cordis 4 release available at implementation time and pin it exactly while it remains prerelease. At specification time this is `cordis@4.0.0-rc.8`.
- Treat Cordis as an in-process implementation dependency of `@nodebraid/runtime-cordis`, not as a peer dependency and not as a public adapter interface.
- Prefer Cordis Context, Fiber, inject, effect, provide, dependency availability, and asynchronous disposal for lifecycle management. Do not implement an independent second scheduler merely to wrap Cordis.
- Maintain only the NodeBraid metadata required for typed Service Token mapping, static declaration validation, Provider reservation, cycle diagnostics, atomic publication, stable snapshots, and error translation.
- Export three creation functions: one to define a Service Token, one to define a Plugin, and one to create an empty Plugin Host.
- Give every Service Token a runtime-unique identity, a TypeScript service type, and a diagnostic name. The diagnostic name does not participate in identity.
- Represent Plugin `requires` and `provides` as static readonly records whose keys are Plugin-local Service Binding names and whose values are Service Tokens.
- Reject invalid Plugin definitions, including overlapping Required and Provided Service declarations that create a self-dependency.
- Expose Required Service values through the Plugin Context as a readonly object keyed by the Plugin's local bindings.
- Do not expose dynamic service lookup, dynamic service publication, Host-level service lookup, Host-level service publication, Cordis Context, or Cordis Fiber.
- Permit the same Plugin definition to form multiple Plugin Installation instances with independent configuration, state, Activation, children, and Owned Resource stacks.
- Treat Plugin configuration as caller-owned immutable input. Do not deep clone, deep freeze, merge, or update it, and do not impose JSON-safe or structured-clone constraints.
- Do not add a shared configuration Schema interface in the first version. A Plugin that needs runtime validation performs it in setup and throws explicitly on failure.
- Reserve every statically Provided Service Token when its Plugin Installation is created. Retain the reservation while pending, active, or failed, and release it only when disposed.
- Reject a Provider conflict synchronously before creating a Plugin Installation.
- Add every accepted Plugin Installation to one explicit acyclic Plugin Graph. Reject the installation that introduces a dependency cycle and include the complete Plugin and Service path in the error details.
- Return Plugin Installation synchronously from install before running user setup code. Begin reconciliation after the caller can obtain the handle and subscribe.
- Keep public Plugin Installation state to pending, active, failed, and disposed.
- Include the missing Required Service tokens in pending snapshots and the original failure value in failed snapshots.
- Keep the same immutable snapshot reference until the public state changes.
- Use a snapshot getter plus a no-argument change subscription as the state observation seam.
- Make `whenActive` complete immediately for active, wait for the next active transition for pending, and reject for failed or disposed. An optional AbortSignal cancels only that waiter.
- Keep setup failure terminal for one Plugin Installation. Recovery requires explicit disposal and a new installation.
- Allow a Plugin setup function to be synchronous or asynchronous.
- Create a fresh Plugin Context, AbortSignal, Required Service object, and Owned Resource stack for every Activation.
- Abort the current Activation when the Plugin Installation is disposed or a Required Service begins disappearing. Await setup settlement and cleanup without hidden timeouts or fake success.
- If setup ignores AbortSignal and never settles, allow disposal to remain incomplete so that the failure is visible.
- Let Plugin setup return all declared Provided Service values. Validate the complete result and publish it atomically only after setup succeeds.
- Permit Plugins with no Provided Service to return no value.
- Withdraw Provided Service values before their Provider Activation is considered ended, while preserving dependency-safe teardown so consumers clean up before their Providers.
- Let Plugin Context register synchronous or asynchronous Owned Resource cleanup. Support NodeBraid disposables without requiring Cordis resource types.
- Release Owned Resource values in reverse registration order.
- Let Plugin Context create Child Installation instances in the same Plugin Graph and automatically own their disposal at the position where they were installed.
- Do not automatically propagate a Child Installation failure to its parent. A Canvas Composition that requires child readiness explicitly waits with `whenActive`, causing setup to fail if that wait rejects.
- Serialize lifecycle transitions within one Plugin Installation while allowing independent graph branches to activate concurrently.
- On Required Service disappearance, abort and deactivate affected consumers in reverse dependency order before releasing the Provider.
- On Required Service return, create a new Activation for pending consumers using the same fixed configuration.
- Continue running remaining cleanup after a disposer throws or rejects, then reject disposal with an AggregateError containing all cleanup failures.
- Make Plugin Installation and Plugin Host disposal asynchronous, idempotent, and terminal.
- Reject new installation once Host disposal has started.
- Expose one NodeBraid `PluginHostError` class with a stable error-code union for structural errors such as disposed Host, Provider conflict, dependency cycle, invalid definition, and contract violation.
- Preserve Plugin setup errors as the failed snapshot error rather than replacing them with Cordis errors.
- Use native AggregateError for multiple cleanup failures.
- Translate all Cordis states and errors inside the implementation. No Cordis type may appear in public declarations or generated exports.
- Keep Plugin Host outside pointer movement, hit testing, frame rendering, and other high-frequency canvas paths.
- Treat token lookup and snapshot reads as constant-time operations. Cycle validation may use a straightforward graph traversal in the first version rather than premature incremental optimization.

## Testing Decisions

- Use the public `PluginHost` interface as the primary and ideally only behavioral test seam. Tests should observe Plugin Installation snapshots, Service-dependent behavior, setup inputs, cleanup effects, returned promises, and public errors.
- Use the real Cordis-backed Plugin Host in tests. Do not introduce a fake Host, Cordis adapter mock, or tests against Cordis Fiber internals.
- Use Bun's existing test runner and follow the repository's mirrored package test structure.
- Keep the existing core-package smoke-test style only for verifying that the public facade re-exports the Plugin Host interface successfully.
- Add compile-time coverage through package type checking for Service Token inference, local Service Binding inference, Plugin configuration requirements, Provided Service result types, and rejection of undeclared service access.
- Test that a new Plugin Host is empty and that no Kernel, Session, Command, Renderer, or other capability appears implicitly.
- Test Service Token identity independently from equal diagnostic names.
- Test multiple independent installations of one consumer Plugin.
- Test Provider reservation in pending, active, and failed states and release after disposal.
- Test synchronous Provider conflict rejection and verify that a rejected installation leaves no state behind.
- Test a consumer installed before its Provider remains pending with the correct missing Token.
- Test Provider activation causes the consumer to activate without depending on installation order.
- Test Provider removal deactivates the consumer before releasing the Provider resource.
- Test replacement Provider installation reactivates pending consumers with fresh service references and a fresh AbortSignal.
- Test complete dependency-cycle diagnostics, including the Plugin and Service path, and verify that the installation introducing the cycle is not retained.
- Test that Plugin setup cannot access undeclared Required Service values or submit undeclared Provided Service values.
- Test that all declared Provided Service values become visible together only after setup succeeds.
- Test that missing, extra, duplicate, null, or undefined Provided Service results fail the Activation and publish nothing.
- Test synchronous setup, asynchronous setup, and setup cancellation.
- Test that disposal during asynchronous setup aborts the Activation, waits for settlement, rolls back resources, and never reports active.
- Test that an intentionally unresolved setup keeps disposal unresolved rather than timing out or reporting false success.
- Test Owned Resource reverse-order cleanup.
- Test that cleanup continues after failures and that disposal rejects one AggregateError containing every failure.
- Test that setup failure rolls back resources from only that Activation, exposes the original error, and does not affect unrelated Plugin Installation instances.
- Test that failed is terminal and does not retry after unrelated Service changes.
- Test stable snapshot references within one state and new references for public state changes.
- Test state subscriptions notify changes, can be removed idempotently, and do not expose Cordis states.
- Test `whenActive` for active, pending, failed, disposed, and waiter-only AbortSignal cancellation.
- Test Child Installation ownership and cleanup at the correct reverse registration position.
- Test a Canvas Composition can explicitly await Child Installation readiness and rolls back all owned children when one awaited child fails.
- Test dependent ordering while allowing controlled independent Activation promises to settle concurrently.
- Test Plugin Installation disposal idempotency, terminal state, and repeated-promise behavior.
- Test Plugin Host disposal idempotency, dependency-safe ordering, complete cleanup, AggregateError reporting, and rejection of later installation.
- Test fixed configuration is reused across reactivation and is not silently cloned, merged, or replaced.
- Inspect generated declarations or package exports to verify that no Cordis import or type crosses the NodeBraid seam.
- Prefer assertions on observable ordering and outcomes over internal maps, graph nodes, Fiber states, event epochs, or private scheduler calls.

## Out of Scope

- Implementing the Kernel, Document, Transaction, Snapshot, Query, or ChangeSet behavior.
- Implementing concrete Kernel, Session, Command, Renderer, Interaction, History, Layout, Validation, Serialization, Persistence, Collaboration, or Domain Plugins.
- Implementing a ready-to-use Canvas Composition or preset.
- Selecting or implementing a default Renderer.
- React, Vue, or other framework adapters.
- Runtime Service optional dependencies.
- Multiple simultaneous Providers or Provider priority, fallback, shadowing, and hot replacement.
- Dynamic Service discovery, Host-level service lookup, or Host-level service publication.
- Plugin configuration update, merge, restart, retry, enable, disable, or hot reload.
- Standard Schema or another universal runtime configuration validation protocol.
- Plugin Graph inspection, management UI, metrics, or a public diagnostics subsystem beyond Installation snapshots and structured errors.
- Hidden timeouts, retry loops, swallowed errors, or fake-success disposal paths.
- Deep cloning or deep freezing arbitrary Plugin configuration or Runtime Service values.
- JSON-safe requirements, Serialized Document design, or persistence formats.
- A second Plugin Host implementation, public Cordis adapter, or test-only runtime implementation.
- Yjs collaboration and cross-client lifecycle concerns.
- Product UI contribution registries, Node Type registries, Port registries, Effect journals, or Renderer contribution registries.

## Further Notes

- The project glossary and accepted ADRs are the source of terminology and architectural intent for this specification.
- “Everything is Plugin” deliberately excludes the minimum Plugin Host substrate. Something non-plugin must own the first installation and the terminal Host lifecycle.
- A Canvas Composition becoming active only means its own setup completed. It represents complete canvas readiness only when it explicitly waits for all required Child Installation instances.
- Cordis should do real lifecycle work. If implementation starts recreating Fiber dependency availability, effect ownership, or asynchronous disposal in a parallel NodeBraid scheduler, it has crossed the intended seam and should be corrected.
- NodeBraid may keep small metadata indexes for static declarations, typed token mapping, diagnostics, atomic publication, and stable public state; these do not replace Cordis as the lifecycle implementation.
- The repository has no prior plugin implementation to preserve. Existing tests only demonstrate the Bun test layout and package smoke-test pattern.
- The working tree contains unrelated and uncommitted user changes. Implementation must limit modifications to the new runtime package, the core facade integration, required workspace metadata, tests, and documentation directly owned by this feature.
