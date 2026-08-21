# CFlow Basic Canvas Composition

**Status:** ready-for-agent

## Problem Statement

CFlow 已经交付 Kernel、Command、Session、Renderer、Interaction、History 与真实 SVG Renderer 闭环，但应用仍需了解完整 Plugin Graph，重复手工创建 Renderer Runtime Plugin、安装六项基础能力并等待每个 Installation active。当前 Quick Start 只证明 headless Kernel 路径，不能让应用以一个明确的公共入口获得完整基础 Canvas Runtime。

这种重复组装使首次采用成本偏高，也容易出现遗漏 History、未等待 Renderer Factory、把 SVG 当成默认 Provider、没有把 Child 生命周期绑定到同一个 Composition，或在错误的顺序中释放资源等问题。目标架构已经预留 Canvas Composition，当前真实 Runtime 与 Chromium 场景也已经提供了足够的重复证据。

## Solution

新增公开、可构建和打包的 `@cflow/preset-basic`，以一个后端无关的普通 Plugin factory 提供 Basic Canvas Composition。应用显式传入 Renderer Factory，继续自行创建 Plugin Host，并把 Provider-specific config 传给返回的 Plugin Installation。Composition 使用 Child Installation 固定组合 Kernel、Command、Session、Renderer、Interaction 与 History，并等待所有 Child active，使 Composition Installation 的 active 成为完整基础运行时的等待点。

Composition 不创建或隐藏 Host，不选择默认 Renderer，不依赖 SVG 或 DOM，不提供新的聚合 Runtime Service，也不公开内部 Child Installation。应用通过 sibling Plugin 的静态 Required Service Binding 使用 Kernel、Command、Session、Renderer 与 History；Layout 和其他扩展继续作为 sibling Plugin 显式安装。

仓库同时增加一个使用真实 SVG Provider 的可运行示例和 Chromium 验收场景。示例显式展示 Host、Basic Canvas Composition、Provider config、静态 Consumer 与完整 dispose；示例可以依赖 SVG，preset package 本身不能。

## User Stories

1. As an application author, I want to create a complete basic Canvas Runtime from one Composition Plugin, so that I do not repeat the standard six-Plugin installation graph.
2. As an application author, I want to keep creating the Plugin Host explicitly, so that Host lifetime and ownership remain visible.
3. As an application author, I want Diagnostics to remain configured on the Host, so that the Composition does not create a second observability configuration path.
4. As an application author, I want to pass an explicit Renderer Factory, so that CFlow never silently selects a backend.
5. As an application author, I want Provider-specific config to retain its exact inferred type, so that SVG, Canvas2D, headless, and future Providers keep their own targets and options.
6. As an application author, I want the Renderer Factory to remain synchronous or asynchronous, so that the Composition preserves the existing Renderer seam.
7. As an application author, I want optional Interaction policy to be fixed when I create the Composition Plugin, so that drag and zoom behavior can be configured without changing Session authority.
8. As an application author, I want the Composition Installation to become active only after every required Child Installation is active, so that `whenActive()` is a truthful readiness point.
9. As an application author, I want a Renderer Factory failure to preserve its original error identity, so that Provider failures remain diagnosable.
10. As an application author, I want a failed Child Activation to roll back the whole Composition tree, so that no partial Canvas Runtime remains installed.
11. As an application author, I want cleanup failures to remain explicit and aggregated, so that resource leaks cannot be represented as success.
12. As an application author, I want disposing the Composition to await Renderer and Plugin cleanup, so that the Target and Runtime resources are truly released.
13. As an application author, I want Child cleanup to occur in dependency-safe reverse order, so that Interaction and History release their consumers before the underlying Services disappear.
14. As an application author, I want an existing standard Service Provider to conflict explicitly with the Composition, so that the preset never silently skips or replaces application choices.
15. As an application author, I want a second Basic Canvas Composition in the same Host to fail explicitly, so that singleton Service semantics remain clear.
16. As an application author, I want multiple canvases to use separate Plugin Hosts, so that graph state, Session state, Plugin environment, and Diagnostics remain isolated.
17. As an application author, I want to install sibling Consumer Plugins using static Required Service Binding, so that no Service Locator or dynamic lookup is introduced.
18. As an application author, I want to install Layout or domain capabilities as sibling Plugins, so that the basic Composition does not choose optional Providers or policies.
19. As an advanced application author, I want to continue installing the six feature Plugins manually, so that custom compositions remain possible without escape hatches inside the preset.
20. As an application author, I want `@cflow/core` to expose the backend-neutral Basic Canvas Composition, so that the facade continues to be a coherent starting point.
21. As an application author, I want concrete Renderer Providers to remain explicit dependencies, so that importing core does not pull SVG, DOM, Canvas, Konva, or Pixi assumptions into my application.
22. As a TypeScript consumer, I want declaration isolation to reject core, Cordis, DOM, and concrete Provider leaks from the preset package, so that the public dependency direction remains enforceable.
23. As a package consumer, I want package-name imports and dry-run package contents to work, so that the workspace package matches its declared public identity.
24. As a new CFlow evaluator, I want a real SVG example using the Composition, so that I can see the intended application-level assembly rather than infer it from package tests.
25. As a CFlow maintainer, I want the real SVG Composition path exercised in Chromium, so that a fake Renderer cannot claim visual success.
26. As a CFlow maintainer, I want successful composition tests to use the real Plugin Host and real Feature Plugins, so that the package is verified at its public seam.
27. As a CFlow maintainer, I want failure adapters used only at the Renderer system seam, so that lifecycle and error cases remain controllable without mocking internal Plugins.
28. As a CFlow maintainer, I want root typecheck, build, browser, docs, and repository checks to include the new package, so that future drift fails visibly.
29. As a documentation reader, I want status and roadmap pages to distinguish the delivered Composition from framework adapters and product UI that remain absent, so that current capability is not overstated.
30. As a JavaScript caller, I want invalid factory or Composition options to fail explicitly, so that misspelled or malformed creation input is not ignored.

## Implementation Decisions

- Build one backend-neutral package whose public interface is a named `createBasicCanvasPlugin` factory plus the small readonly options type required to configure Interaction policy.
- `createBasicCanvasPlugin` accepts a typed Renderer Factory and returns a normal Plugin whose Installation config remains exactly the Renderer Factory config. The preset does not wrap Provider config in a universal schema.
- Optional Composition options are fixed at Plugin creation time. They may route an optional Interaction config but do not accept arbitrary Plugins, hooks, registries, Service overrides, Diagnostics, Host options, or Provider config.
- Snapshot the CFlow-owned Interaction option shell when the Plugin is created. Provider config continues to follow the existing Renderer Factory convention: shallow readonly at the type seam, no generic clone or deep freeze, and Provider-owned validation.
- Create all six Child Installations before awaiting readiness, in the fixed order Kernel, Command, Session, Renderer, Interaction, History. Then await every Child Installation before the parent setup completes.
- The reverse ownership order is History, Interaction, Renderer, Session, Command, Kernel. Existing Plugin Host cleanup semantics remain authoritative; the preset adds no second rollback engine.
- Composition active means all six Child Installations completed their initial Activation. Child Services still publish through the existing shared Plugin Graph and are not atomically hidden until the parent becomes active.
- The parent Plugin has no Required Service and provides no Runtime Service. A failed Composition is terminal for that Installation and never retries itself. Recovery uses a new Installation; callers still dispose the failed Installation as normal lifecycle ownership, but the rolled-back parent holds no preset-level reservation that blocks a replacement.
- Preserve the original Child setup, Provider Factory, Provider projection, and application callback error identities. Cleanup failures continue through the existing nested `AggregateError` structure.
- Existing Provider, duplicate Composition, and standard Service conflicts use the current Service Token reservation and `PROVIDER_CONFLICT` behavior. The preset never probes and skips an existing capability.
- One Basic Canvas Composition is supported per Plugin Host. Multiple canvases use multiple Hosts; scoped tokens, child Hosts, and multi-Canvas registries are not introduced.
- Keep Layout outside the fixed member set. Applications install Layout Runtime integration and a chosen Layout Provider as sibling Plugins.
- Keep Host and Diagnostics application-owned. The preset receives neither Host options nor diagnostic sinks/reporters.
- Re-export the backend-neutral Composition from `@cflow/core`, while concrete Renderer and Layout Providers remain explicit dependencies and are not re-exported.
- Add one canonical real SVG example as a consumer of the public preset and concrete SVG Provider. The example must not create a dependency from the preset package to SVG or DOM.
- Update the workspace build graph, root typecheck, core facade, declaration checks, package-name probes, documentation catalog, status, roadmap, and bilingual module documentation to describe only implemented behavior.
- Treat the package as publishable within the repository, while retaining the existing warning that the current `@cflow/*` npm scope cannot yet be safely published by this project.

## Testing Decisions

- Test only caller-observable behavior through confirmed public seams; do not assert the private Child array, setup implementation, Cordis Fiber state, internal cleanup stacks, or private configuration helpers.
- Use two agreed high-level seams: `createBasicCanvasPlugin` plus public `PluginInstallation`/static Required Service Consumers for package behavior, and real `createSvgRenderer` plus Chromium for visible end-to-end success.
- Use real Plugin Host, Kernel, Command, Session, Renderer Runtime, Interaction, and History Plugins in Composition tests. A controlled Renderer Adapter may be supplied only at the explicit Renderer Factory seam for readiness, cancellation, failure, and disposal cases.
- Do not use a fake Renderer to prove projection, Selection, Drag, Pan, Wheel Zoom, Hit Test, Pointer Capture, Focus, Undo, Redo, or browser lifecycle success.
- Start each vertical slice with one failing public behavior test, implement only enough to pass, and continue one test at a time. Refactoring belongs to the later review stage.
- Verify that a typed Provider config reaches the Renderer Factory unchanged and that required config cannot be erased through generic widening.
- Verify that optional Interaction policy reaches the real Interaction Activation and that invalid Interaction config preserves `InteractionError` identity.
- Verify that the parent remains non-active while an async Renderer Factory is unresolved and becomes active only after all Child Installations are ready.
- Verify static sibling Consumers can receive Kernel, Command, Session, Renderer, and History Services without a new aggregate Service.
- Verify Move Nodes Command and History Undo/Redo through the composed real Feature Plugins, without reaching into Child Installations.
- Verify existing Provider and duplicate Composition conflicts fail explicitly, roll back already-created Child Installations, and release reservations after disposal.
- Verify Provider Factory rejection, awaited Child failure, asynchronous Renderer disposal, complete reverse cleanup, and cleanup error aggregation through public Installation results.
- Verify separate Plugin Hosts can activate independent Basic Canvas Compositions with distinct Kernel and Session state.
- Add a real Chromium tracer using the SVG Provider that observes projection, Selection or Drag, one stable Commit, History Undo/Redo, Pan or Wheel behavior, and final Host disposal.
- Verify declaration isolation contains no `@cflow/core`, bare Cordis, concrete Renderer, DOM, or native event types in the preset package.
- Verify package-name import, clean dependency build, package contents with `bun pm pack --dry-run`, bilingual docs, executable documentation examples, and the root repository completion gate.
- Use Runtime Child Composition tests, Renderer Runtime public-seam tests, Interaction Chromium tests, SVG Provider contract tests, and existing core declaration checks as prior art.

## Out of Scope

- React, Vue, Svelte, or other framework Adapters.
- Product editor shell, node UI, Toolbar, Inspector, Minimap, menus, overlays, or theming system.
- Default Renderer, Renderer Registry, dynamic Provider selection, capability negotiation, or Renderer fallback.
- Layout Provider selection or default Layout installation.
- Arbitrary Plugin arrays, optional Runtime Service, dynamic registry, generic hooks, or Service Locator.
- Exposing internal Child Installation, Child Service values, Cordis Context, Fiber, Service, or effect types.
- Multiple Basic Canvas Compositions in one Host, scoped Service Tokens, nested Hosts, shared Document Views, or Renderer hot switching.
- Persistence, Serialization schema, remote synchronization, Collaboration, Yjs, Presence, or Comments.
- Tool Registry, box selection, edge connection, snapping, pinch/touch gestures, text editing, IME, clipboard, or product shortcuts.
- Changing Kernel, Session, Renderer, Interaction, Command, or History authority and lifecycle contracts.
- Publishing the current `@cflow/*` names to npm before the project owns an appropriate package scope.
- Silent skipping, automatic retry, timeout-based cleanup, mock success, or swallowed errors.

## Further Notes

- The agreed testing seams were part of the confirmed recommended design before this spec was published.
- Basic Canvas Composition is the canonical capability term. `preset-basic` is the package identity, not a new Runtime class or default Canvas.
- Parent active is a readiness waiting point, not an atomic visibility barrier or permanent health signal. Runtime failures after Activation continue to follow the owning Feature Plugin contract.
- The exact public six-Plugin tuple currently appears in one authoritative real Chromium setup, while the same Kernel/Command/Session/Renderer/Interaction shape appears in several independent scenarios. The package extracts the repeated composition pattern without claiming more evidence than exists.
- The current Quick Start remains useful as the smallest headless Kernel path; the real SVG Composition example adds the next adoption layer instead of erasing that lower-level example.
