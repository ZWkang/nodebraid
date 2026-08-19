# CFlow SVG Renderer Provider

**Status:** ready-for-agent

## Problem Statement

CFlow 已经有 backend-neutral `@cflow/renderer-api`、拥有 Renderer Instance 与状态同步的 `@cflow/plugin-renderer`，以及可提供 Document 与 Session 的真实 Runtime Plugin。但项目尚无任何官方 Renderer Provider，因此调用方无法选择一个可发布、可测试且真正遵循公共 Renderer seam 的 SVG 实现。

没有参考实现时，每个使用者都需要重新决定 Target 所有权、Document revision 同步、Session 顺序、Viewport 坐标、DOM 层级、命中、原生输入、Pointer Capture、Focus 和释放语义。这些实现容易把 `node.type` 或 `node.data` 错当产品渲染协议，把缺少的 Size 或 Port Geometry 静默猜测出来，或者绕过 CFlow-owned Input 与错误边界直接暴露 DOM Event。

首个官方 Provider 必须是 reference-quality 的通用 Canvas 语义投影，用真实 SVG DOM 和真实浏览器输入证明现有 Renderer 协议完整可行。它不能成为默认 Renderer，也不能把 SVG-specific 假设泄漏到 `@cflow/renderer-api` 或 `@cflow/core`。

## Solution

新增可独立发布的 `@cflow/renderer-svg`。它导出同步具名 Factory，把一个已连接、可测量且 CTM 可逆的现有 `SVGSVGElement` 绑定为 SVG Renderer Target，并返回完整实现公共 `CanvasRenderer` interface 的 Renderer Instance。

Provider 在 Target 末尾追加一个自己拥有的 SVG Projection 子树，用稳定 class 与 `data-*` attributes 暴露 CSS 和测试 seam。首版只投影具有显式 Size 的矩形 Node、两个 Node 中心之间的无 Port 直线 Edge、Selection 和 Viewport。它不解释产品 `type` 或 `data`，不从 DOM 反向推导 Document Geometry，对缺少 Size、Port-qualified Edge 和自环 Edge 显式拒绝。

`reset` 从完整 Canvas View 建立 Renderer Baseline 并可重建实体 DOM；连续 `commit` 完整预检 before/after/Change Set evidence 后按 key 增量更新，保留已有 Node 与 Edge 的 DOM identity，并重算因 Node Geometry 变化而间接受影响的 Edge。Session 独立预检并原子更新 Selection 标记和 Viewport transform。任何输入验证失败都不改变旧 Projection、Baseline 或 Session。

Screen Point 保持 Target-local CSS pixel 语义。Provider 通过 Target 的可逆 `getScreenCTM()` 把该坐标映射到现有 SVG user space，因此不覆写调用方 `viewBox` 或 `preserveAspectRatio`，也不创建嵌套 SVG root。`hitTest` 使用 Provider 已接受的语义 Geometry，不依赖浏览器 element hit testing 或调用方样式。

Provider 直接监听真实 Pointer、Wheel、Keyboard 与 context menu DOM events，把可发布的部分规范化为 CFlow-owned Renderer Input。Factory config 显式决定每类事件是否 `preventDefault` 或 `stopPropagation`，默认均为 false。Pointer Capture 与 Focus 使用浏览器原生能力，却只通过公共 CFlow control methods 对外提供。

Provider 用公共 `RendererError` 表达 Document、Session、Screen Point、Pointer 与 disposed 失败，并用 package-owned `SvgRendererError` 表达 SVG config 与 Target 失败。Target Reservation 从 Factory 接受 Target 持续到 dispose 清理成功，防止两份实例共享同一 Target。

## User Stories

1. As a CFlow package consumer, I want an official SVG Renderer Provider, so that I can render a Canvas without implementing the backend-neutral protocol myself.
2. As a CFlow package consumer, I want the SVG Provider independently installable, so that selecting SVG does not pull other concrete Renderer backends into my application.
3. As a CFlow package consumer, I want SVG to remain one peer Provider, so that CFlow does not impose it as the default Renderer.
4. As a CFlow maintainer, I want the Provider to depend on narrow CFlow contracts rather than the core facade, so that package dependency direction remains explicit.
5. As a CFlow maintainer, I want one synchronous named Factory, so that construction does not invent an asynchronous lifecycle without a backend need.
6. As an application author, I want to pass an existing SVG root, so that layout and ownership of the actual Target remain in my application.
7. As an application author, I want the Provider not to create or remove my SVG Target, so that disposing a Canvas cannot delete application-owned DOM.
8. As an application author, I want one Renderer Instance bound to one Target, so that remounting cannot leave ambiguous DOM or input ownership.
9. As an application author, I want an invalid non-SVG Target rejected, so that unsupported integration never appears operational.
10. As an application author, I want a detached or unmeasurable Target rejected, so that projection coordinates are never guessed.
11. As an application author, I want a Target with a non-invertible transform rejected, so that Screen Point conversion cannot silently corrupt geometry.
12. As an application author, I want a second live Factory call for the same Target rejected, so that two Renderer Instances cannot overlap their Projection or listeners.
13. As an application author, I want a successfully disposed Target reusable, so that I can replace a Renderer Instance deliberately.
14. As an application author, I want the Provider to preserve my existing SVG children, so that definitions and application-owned decorations survive activation and disposal.
15. As an application author, I want the Projection root appended without reordering my nodes, so that visual composition with caller content is deterministic.
16. As a styling author, I want stable Projection, layer, Node and Edge classes, so that CSS can style the generic geometry without a theme registry.
17. As a styling author, I want stable Node and Edge ID data attributes, so that diagnostics and browser tooling can identify projected entities.
18. As a styling author, I want Selection represented by a stable data attribute, so that selected appearance remains a CSS concern.
19. As a styling author, I want the Provider to avoid product colors and inline theme rules, so that application style remains authoritative.
20. As a framework author, I want no arbitrary Node render callback, so that the base Provider does not become a hidden React or Vue node system.
21. As a Canvas consumer, I want every sized Node projected as a rectangle at its absolute World position, so that the visual output follows Kernel geometry.
22. As a Canvas consumer, I want Node position treated as its top-left corner, so that SVG agrees with Kernel and Layout semantics.
23. As a Canvas consumer, I want an unsized Node rejected, so that the Provider never guesses product-specific dimensions.
24. As a Canvas consumer, I want a portless Edge projected as a straight line between Node centers, so that generic connections are visible without a Port system.
25. As a Canvas consumer, I want a port-qualified Edge rejected, so that missing Port Geometry is not silently replaced by a Node center.
26. As a Canvas consumer, I want a self-loop rejected, so that an invisible zero-length line is not reported as rendered successfully.
27. As a Canvas consumer, I want `node.type` and `node.data` ignored for visual semantics, so that the Provider stays product-neutral.
28. As a Canvas consumer, I want `parentId` not to create SVG scene nesting, so that graph containment is not confused with Renderer ownership.
29. As a Runtime author, I want reset to establish a complete Renderer Baseline, so that later commits have an unambiguous starting state.
30. As a Runtime author, I want reset to accept any valid revision, so that Runtime resynchronization can recover from a lost incremental history.
31. As a Runtime author, I want commit to require the current before revision, so that stale, duplicate and skipped updates fail visibly.
32. As a Runtime author, I want commit evidence validated across before, after and Change Set, so that inconsistent caller data cannot partially change the Projection.
33. As a Runtime author, I want the accepted before content matched against the local Baseline, so that matching revision numbers cannot hide divergent state.
34. As a Runtime author, I want the Change Set checked against the before and after Views, so that incremental DOM work is backed by complete commit evidence.
35. As a Runtime author, I want reset and commit validation to be all-or-throw, so that a failed update preserves the previous Baseline and DOM.
36. As a Runtime author, I want a failed DOM patch rolled back, so that a surfaced browser failure does not knowingly leave a half-applied Projection.
37. As a Runtime author, I want a failed rollback to mark the Renderer out of sync, so that only an explicit reset can re-establish trusted state.
38. As a Runtime author, I want unknown DOM failures preserved as their original errors, so that debugging evidence is not hidden by a generic wrapper.
39. As a DOM observer, I want unchanged keyed entities to keep their element identity across commits, so that incremental projection is observable and stable.
40. As a DOM observer, I want reset allowed to rebuild entity elements, so that explicit resynchronization does not pretend to be incremental.
41. As a DOM observer, I want entity elements kept in canonical ID order, so that output is deterministic regardless of transaction operation order.
42. As a Canvas consumer, I want an Edge recomputed when either endpoint Node moves or resizes, so that derived geometry never becomes stale.
43. As a Canvas consumer, I want a data-only commit accepted without inventing visual semantics, so that the Renderer Baseline still advances correctly.
44. As a direct CanvasRenderer caller, I want the Provider to copy CFlow-owned shells on acceptance, so that later mutation of forged input cannot rewrite the Baseline silently.
45. As a domain Plugin author, I want opaque data retained only by reference for evidence, so that the Renderer does not traverse, clone or serialize domain values.
46. As a Runtime author, I want Session rejected before a Document Baseline exists, so that Selection cannot reference an unknown Projection.
47. As a Runtime author, I want Selection IDs validated against the accepted Document, so that the DOM never contains selected state for missing entities.
48. As a Runtime author, I want Selection membership canonical and unique, so that forged Session values fail rather than creating ambiguous state.
49. As a Runtime author, I want Viewport values finite with positive zoom, so that SVG transforms and World Point conversion remain defined.
50. As a Runtime author, I want Session validation all-or-throw, so that Selection and Viewport never split across two accepted states.
51. As a Canvas consumer, I want Viewport applied with the shared world-to-screen formula, so that SVG agrees with every other Renderer Provider.
52. As a browser integrator, I want Screen Point expressed in Target-local CSS pixels, so that input and hit testing are independent of device pixel ratio.
53. As a browser integrator, I want the Provider to map CSS pixels through the existing SVG CTM, so that a static viewBox need not be removed or rewritten.
54. As a browser integrator, I want resize to refresh the Projection mapping, so that the same Viewport remains correct when the Target changes size.
55. As a browser integrator, I want a newly unavailable Target reported explicitly, so that detached, zero-size or singular state does not silently degrade.
56. As an Interaction author, I want hitTest to return the topmost Node before an underlying Edge, so that semantic targeting agrees with the visible layer model.
57. As an Interaction author, I want overlapping entities resolved by deterministic reverse canonical order, so that hit results do not depend on incidental mutation order.
58. As an Interaction author, I want Edge hit tolerance measured in CSS pixels, so that zoom and device pixel ratio do not make connections impossible to target.
59. As an Interaction author, I want a default four-pixel Edge tolerance with an explicit override, so that common use works while precision remains configurable.
60. As an Interaction author, I want blank space inside the Target reported as Canvas, so that pan and deselection behavior can distinguish it from outside.
61. As an Interaction author, I want points outside the Target to return no Hit Result, so that unrelated page space is not treated as Canvas.
62. As an Interaction author, I want hitTest independent of CSS stroke and fill, so that theming cannot accidentally change interaction semantics.
63. As an Interaction author, I want caller-owned SVG content ignored by semantic hit testing, so that decorative elements do not leak through the CFlow seam.
64. As an Interaction author, I want no Port Hit Result before Port Geometry exists, so that unsupported capability is not fabricated.
65. As an Interaction author, I want native Pointer events normalized to CFlow Pointer Input, so that behavior code has no DOM dependency.
66. As an Interaction author, I want Pointer screen and world coordinates based on the accepted Viewport at event time, so that drag calculations use one coherent state.
67. As an Interaction author, I want standard mouse, pen, touch and unknown pointer kinds preserved, so that interactions can make backend-neutral distinctions.
68. As an Interaction author, I want button and pressed-button state normalized to the public PointerButton vocabulary, so that native bitmasks do not cross the seam.
69. As an Interaction author, I want captured Pointer movement outside the Target still published with finite local coordinates, so that drag continuity survives boundary crossing.
70. As an Interaction author, I want capture limited to Active Pointers, so that unknown or ended IDs fail explicitly.
71. As an Interaction author, I want repeated capture and release to be idempotent, so that lifecycle cleanup is safe to repeat.
72. As an Interaction author, I want up, cancel and dispose to release capture, so that no ended Pointer remains owned.
73. As an Interaction author, I want native Wheel events normalized to CSS-pixel deltas, so that zoom and pan logic receives one unit system.
74. As an Interaction author, I want pixel, line and page Wheel modes converted by stable documented rules, so that browser modes cannot create hidden variability.
75. As an Interaction author, I want Keyboard Input published only while the Target owns focus, so that page-level keystrokes do not leak into the Canvas.
76. As an Interaction author, I want `focus()` to avoid scrolling the page, so that keyboard activation does not unexpectedly move the viewport.
77. As an application author, I want an absent tabindex temporarily supplied and later restored, so that programmatic focus works without stealing tab order permanently.
78. As an application author, I want preventDefault and stopPropagation independently configured per native input family, so that browser integration policy is explicit.
79. As an application author, I want all native default-control policies disabled by default, so that adopting the Provider does not silently suppress page behavior.
80. As an application author, I want context menu policy configurable without adding a new Renderer Input kind, so that browser behavior and CFlow facts remain separate.
81. As an application author, I want touch-action left to Target CSS, so that the Provider does not install an undocumented gesture policy.
82. As a Renderer Input subscriber, I want listeners notified in registration order, so that synchronous behavior is deterministic.
83. As a Renderer Input subscriber, I want subscribe and unsubscribe during delivery to affect only the next Input, so that one notification has a stable listener set.
84. As a Renderer Input subscriber, I want reentrant Input delivered breadth first, so that all listeners observe N before any observe N+1.
85. As a Renderer Input subscriber, I want one listener failure not to block later listeners or queued Input, so that failure isolation preserves ordering.
86. As a direct Provider consumer, I want listener failures surfaced after draining, so that the Provider never silently swallows my error.
87. As a Runtime consumer, I want listener failures reported once through the existing Runtime diagnostics boundary, so that Provider delivery does not duplicate faults.
88. As an application author, I want dispose immediately to make the Renderer terminal, so that no operation races with cleanup and appears accepted.
89. As an application author, I want dispose idempotently to reuse one Promise, so that repeated lifecycle cleanup cannot run twice.
90. As an application author, I want dispose to remove only Provider-owned DOM and listeners, so that caller content remains intact.
91. As an application author, I want dispose to restore Provider-added Target attributes, so that the caller receives the Target in its prior integration state.
92. As an application author, I want Target Reservation retained until cleanup succeeds, so that a replacement Renderer cannot overlap residual resources.
93. As an application author, I want cleanup failures aggregated and visible, so that partial disposal is never reported as success.
94. As an application author, I want failed cleanup to keep the Target reserved, so that unsafe reuse fails rather than compounding corruption.
95. As a direct CanvasRenderer caller, I want every post-dispose method except dispose to raise `RENDERER_DISPOSED`, so that a stale handle never appears active.
96. As a package consumer, I want SVG-specific config and Target failures represented by a structured SVG error, so that I can distinguish them without expanding the backend-neutral API.
97. As a package consumer, I want generic Document and Session failures represented by public Renderer errors, so that Runtime handling remains Provider-neutral.
98. As a package consumer, I want error details limited to safe IDs, fields, revisions and issue labels, so that graph data and native objects do not leak into diagnostics.
99. As a Canvas Runtime author, I want the official Renderer Plugin to drive the SVG Provider, so that reset, commit, Session ordering and disposal are proven with production composition.
100. As a Canvas Runtime author, I want a Renderer out-of-sync failure to trigger the existing Runtime reset path, so that recovery uses authoritative Kernel state.
101. As a test author, I want Provider behavior tested through its public CanvasRenderer seam, so that tests survive internal refactors.
102. As a test author, I want runtime synchronization tested with real Plugin Host, Kernel, Session and Renderer Plugins, so that fake Renderer success cannot replace production behavior.
103. As a test author, I want real Chromium Pointer, Wheel, Keyboard, Focus and Capture behavior exercised, so that a simulated event object cannot falsely prove browser integration.
104. As a test author, I want exact public type and declaration coverage, so that DOM types stay inside the SVG package and the backend-neutral API remains clean.
105. As a maintainer, I want browser tests included in the repository check, so that input and SVG regressions fail the normal completion gate.
106. As a maintainer, I want the package independently buildable and packable, so that publication metadata and declarations are verified before release.
107. As a maintainer, I want no fake Renderer, hidden retry, timeout, silent fallback or guessed geometry, so that failures expose the root contract violation.

## Implementation Decisions

- Add one publishable package named `@cflow/renderer-svg`; it is a concrete Provider and does not depend on `@cflow/plugin-renderer`, `@cflow/runtime-cordis` or `@cflow/core`.
- Depend directly on `@cflow/renderer-api`, `@cflow/kernel`, `@cflow/session-api` and `@cflow/diagnostics` only as required by public types, evidence validation and structured errors.
- Export a synchronous named `createSvgRenderer` Factory, `SvgRendererConfig`, the DOM event policy value types, `SvgRendererError` and `SvgRendererErrorCode`. Do not provide a default export.
- Keep the Factory compatible with `RendererFactory<SvgRendererConfig>` while returning `CanvasRenderer` synchronously.
- Accept one existing `SVGSVGElement` Target, an optional finite non-negative `edgeHitTolerance` defaulting to four CSS pixels, and optional pointer, wheel, keyboard and context-menu policies containing `preventDefault` and `stopPropagation` booleans.
- Validate config without coercion. Unknown or invalid policy values fail with `SvgRendererError` code `INVALID_CONFIG`.
- Validate that Target belongs to an active document, is connected, has a finite non-zero bounding rectangle and exposes a finite invertible screen CTM. Invalid initial Target state fails with `INVALID_TARGET`; equivalent state reached later fails with `TARGET_UNAVAILABLE` on the operation that observes it.
- Reserve the Target with both a process-local identity reservation and a stable DOM marker. Either marker rejects another Factory with `TARGET_OCCUPIED`.
- Append one Provider-owned Projection root group to the end of Target. Preserve all caller-owned nodes and never accept an insertion-point option.
- Use stable classes `cflow-renderer-svg`, `cflow-renderer-svg__edges`, `cflow-renderer-svg__edge`, `cflow-renderer-svg__nodes` and `cflow-renderer-svg__node`.
- Use stable `data-cflow-edge-id`, `data-cflow-node-id` and `data-cflow-selected` attributes. Selected entities carry the selected marker; unselected entities omit it.
- Put one Edge layer before one Node layer. Keep each layer in canonical ascending entity-ID order. Selection never changes order.
- Render each Node as an SVG rectangle using absolute World top-left position and explicit width and height. Do not interpret type, data or parentId as presentation.
- Render each supported Edge as an SVG line between source and target Node centers. Reject either port-qualified Endpoint and reject a self-loop.
- Supply only geometry, stable classes and stable data attributes. Do not install default colors, strokes, fills, product theme, theme registry or render callback.
- Treat Canvas Snapshot arrays as the projection input. Do not invoke CanvasQuery during reset, commit planning or hit testing.
- Copy accepted CFlow-owned shells and nested geometry into an internal Baseline. Retain opaque data references only for evidence equality; do not traverse, clone, freeze or serialize them.
- Validate runtime-forged values despite TypeScript declarations: View and Commit shape, adjacent safe revisions, canonical unique entity arrays, graph references, entity shells, Change Set entries and exact before/after consistency.
- Use `RendererError` code `INVALID_DOCUMENT_UPDATE` with safe issue details for malformed evidence, missing Node Size, unsupported Port Geometry and unsupported self-loop.
- Use `DOCUMENT_OUT_OF_SYNC` for commit without a Baseline, non-contiguous revision, before content that differs from the accepted Baseline, or an instance marked out of sync after rollback failure.
- Let reset accept any valid Canvas View and replace the Baseline. Reset may rebuild all projected entity elements.
- Let commit apply only after complete preflight. Preserve existing keyed SVG element identity, add and remove exact keys, maintain canonical order and update every incident Edge affected by changed Node geometry.
- Keep Baseline advancement after successful DOM application only. Validation failures preserve old Baseline and DOM.
- Journal incremental DOM mutations. On an unknown DOM failure, reverse every applied mutation and rethrow the original failure; if rollback also fails, throw an AggregateError and reject every later commit until reset.
- Require a Document Baseline before Session. Validate canonical unique Selection IDs against the accepted Baseline and validate finite Viewport values with positive zoom.
- Apply Session atomically: update selected markers and the Viewport transform together only after validation.
- Derive the SVG screen-to-user transform from Target-local CSS pixels and the inverse current screen CTM. Compose it with the accepted Session Viewport transform.
- Refresh coordinate mapping from ResizeObserver and before every public update, native input normalization and hit test. Do not overwrite Target viewBox, preserveAspectRatio or transform attributes.
- Document that a dynamic ancestor transform which triggers neither resize nor any Provider operation may remain visually stale until the next refresh opportunity.
- Compute `hitTest` from accepted semantic geometry. Reject non-finite points; return null outside the current Target rectangle; test Nodes first and Edges second in reverse canonical order; return Canvas for remaining in-bounds points.
- Measure Edge distance in Target-local CSS pixels and never derive hit tolerance from CSS stroke width. Do not return Port in the first version.
- Attach real pointerdown, pointermove, pointerup, pointercancel, wheel, keydown, keyup and contextmenu listeners to Target using its owner document and window environment.
- Normalize Pointer type, ID, changed button, pressed buttons, modifiers, Target-local Screen Point and accepted-Viewport World Point into the public RendererInput union.
- Track Active Pointers from down through up or cancel. Use Target setPointerCapture and releasePointerCapture, make repeated capture/release idempotent and reject unknown or ended IDs with `INVALID_POINTER`.
- Preserve captured input outside Target bounds; Screen Point may be outside while remaining finite.
- Add `tabindex="-1"` only when Target lacks tabindex, remember whether it was Provider-added and restore it during disposal. Use focus with preventScroll and publish Keyboard Input only when Target is the active element.
- Normalize Wheel pixel deltas unchanged, line deltas by sixteen CSS pixels and page deltas by current Target-local height. Do not involve Viewport zoom or device pixel ratio.
- Apply configured default and propagation behavior for each native event family before publishing its Renderer Input. Context menu policy emits no Renderer Input. Do not set touch-action.
- Implement Input Subscription as a breadth-first FIFO with stable listener snapshots and idempotent unsubscribe. Add/remove during a delivery affects the next Input.
- Continue all listeners and queued Inputs after listener failure, then throw the original single failure or an AggregateError after the drain. Runtime-wrapped listeners continue to use the existing diagnostics boundary.
- Make dispose terminal immediately and return the same Promise for every call. Post-dispose public calls except dispose raise `RENDERER_DISPOSED`; existing unsubscribe functions remain idempotent.
- Dispose all input relationships and Pointer Capture, disconnect ResizeObserver, remove only Provider-owned Projection DOM, restore Provider-added Target attributes and release Target Reservation only after every cleanup succeeds.
- Aggregate cleanup failures and retain Target Reservation when cleanup is incomplete.
- Keep unknown browser and DOM failures as their original values. Do not wrap them as known config or Renderer failures.
- Keep `@cflow/core` backend-neutral and do not re-export `@cflow/renderer-svg` from it.
- Add accurate package scripts for dependency builds, type checking, tests, declaration isolation and package dry-run verification. Update root workspace scripts and documented commands when the browser-test toolchain is added.

## Testing Decisions

- Tests verify behavior through two pre-agreed public seams only. The primary seam is `createSvgRenderer` returning `CanvasRenderer`; the integration seam is `createRendererPlugin(createSvgRenderer)` installed with real Plugin Host, Kernel Plugin and Session Plugin.
- The user confirmed both seams before specification publication. No test may reach into internal Baseline maps, queues, rollback journals, reservation tables or private helpers.
- Provider tests observe public method results, structured errors and the application-owned SVG Target, because the SVG Projection is the Provider's intended visible output rather than an internal side channel.
- Use real headless Chromium as the authoritative DOM environment for SVG CTM, ResizeObserver, native Pointer/Wheel/Keyboard events, Focus, Pointer Capture and disposal. Do not substitute a fake Renderer, hand-built fake SVG element or fake event target.
- Drive Chromium with the repository-locked `agent-browser` CLI from a Bun assertion script. The CLI is the browser boundary driver, not a production dependency of the Provider; the script builds a test-only browser entry, serves it locally, executes public-seam scenarios and fails with a non-zero exit code on any assertion.
- Keep pure compile-time and package-contract checks in Bun, but do not create private-helper unit tests merely because validation or geometry is complex.
- Work in vertical red-to-green tracer slices: one public behavior test must fail for the expected reason before adding only enough production behavior to pass it.
- Start with a browser tracer that creates the Provider on a real SVG Target, sends the real Kernel's empty revision-zero reset plus Session, then resets to the real revision-one single-Node View and observes one rectangle through stable public DOM markers.
- Add the first Edge in the next slice and verify exact literal center coordinates and layer order through public Projection output.
- Add reset validation cases for missing Size, Port-qualified Edge and self-loop and prove prior Projection and Baseline remain usable after each rejection.
- Add commit slices for Node add, replace, move, resize and remove; Edge add/remove; indirect incident-Edge recomputation; canonical ordering; DOM identity preservation; and reset identity replacement.
- Add forged evidence cases for invalid View shape, duplicate or unsorted IDs, broken graph references, inconsistent revisions, mismatched before content, incomplete or incorrect Change Set and commit without Baseline.
- Prove data-only commits advance Baseline without changing generic geometry and preserve opaque data reference semantics without inspecting data.
- Add Session slices for Selection markers, Viewport transform, atomic Selection-plus-Viewport update, missing Baseline, dangling IDs, noncanonical membership and invalid zoom.
- Add worked coordinate examples with literal expected Target-local Screen and World Points under translation, zoom, viewBox and a reversible CSS transform. Expected values must not be recomputed by the implementation algorithm inside the assertion.
- Add ResizeObserver coverage and explicit Target-unavailable cases for detach, zero-size and singular CTM.
- Add hit-test slices for overlapping Nodes, Node-over-Edge priority, reverse canonical order, default and configured Edge tolerance, Canvas blank space, Target exterior and invalid Screen Point.
- Dispatch real Chromium Pointer input and assert normalized literal Pointer type, button, pressed buttons, modifiers, Screen Point and World Point.
- Exercise real capture from a pointer-down subscriber, movement outside the Target, idempotent capture/release, automatic up/cancel release and invalid pointer errors.
- Exercise real Focus and Keyboard input, temporary tabindex behavior, preventScroll behavior where observable, no publication while unfocused and attribute restoration on dispose.
- Dispatch pixel, line and page Wheel events and assert literal CSS-pixel deltas. Prove Viewport zoom and device pixel ratio do not alter normalization.
- Cover preventDefault and stopPropagation independently for pointer, wheel, keyboard and context menu with real DOM listeners outside the Provider.
- Cover Input listener ordering, subscribe/unsubscribe during delivery, breadth-first reentrancy, idempotent unsubscribe and post-drain error surfacing through the public subscription seam.
- Use browser-boundary fault injection only where the real platform does not naturally produce a reachable failure, such as forcing one DOM mutation to throw while verifying rollback through the public Target output. Do not mock CFlow-owned collaborators.
- Cover Target Reservation for active, disposing, successfully disposed and failed-cleanup instances through repeated public Factory calls.
- Cover dispose cleanup of Projection, listeners, observer effects, capture and Provider-added attributes; prove caller-owned content remains and every stale public method fails.
- Install the real Renderer Plugin with real Kernel and Session Providers, then prove initial reset-before-Session, incremental Kernel Commit projection, Selection reconciliation, Viewport update, lost-revision reset recovery, input forwarding, Hit Result, Focus/Capture service controls and Activation disposal.
- Follow existing Kernel, Session and Renderer Plugin tests as prior art for immutable Views, real Runtime composition, reentrant observer ordering, error identity and lifecycle cleanup.
- Add public type tests for exact Factory config, readonly policies, synchronous CanvasRenderer result, error unions and absence of default export or runtime Plugin exports.
- Add declaration isolation checks that allow DOM/SVG types only inside the concrete SVG package and reject Cordis, Plugin Host, framework, Canvas2D, Konva, Pixi and `@cflow/core` leakage.
- Add a package-name import probe and package dry-run packing validation.
- Make real Chromium tests part of the normal repository completion check. Document the browser installation command and keep AGENTS and README command lists accurate.
- Before completion run package tests, browser tests, package typecheck and build, declaration checks, package dry-run, repository check, formatting, `git diff --check` and final status inspection.

## Out of Scope

- Making SVG the default Renderer or adding a concrete Provider registry.
- Re-exporting the concrete SVG Provider through `@cflow/core`.
- Canvas2D, Konva, Pixi, WebGL, GPU or OffscreenCanvas implementations.
- HTML Overlay, foreignObject-based application nodes or DOM portal ownership.
- React, Vue, Svelte or other framework Node components and adapters.
- Product Node type registry, arbitrary Node renderer registry or interpretation of `node.data`.
- Rich text editing, labels, text measurement, icon systems or font loading.
- Images, image export, SVG serialization, screenshots, PDF export or printing.
- Animation, transitions, interpolation or frame scheduling.
- Edge Routing, orthogonal paths, curves, arrows, labels or waypoint editing.
- Port registry, Port Geometry resolution, Port rendering or Port Hit Results.
- Self-loop routing or visual fallback for unsupported Edges.
- Automatic Layout or any Document writes from the Renderer.
- Z-index or product-defined stacking beyond deterministic Edge-before-Node and canonical ID order.
- Product theme registry, inline default theme, design tokens or arbitrary style callbacks.
- Accessibility Tree, ARIA interaction model, keyboard navigation or screen-reader semantics.
- IME composition, text input, clipboard, drag-and-drop, gestures, pressure, tilt or coalesced Pointer events.
- Safari and Firefox certification in the first version; Chromium is the tested browser environment.
- Continuous observation of every possible dynamic ancestor CSS transform when no resize, input, hit test or Renderer update occurs.
- Silent geometry defaults, fallback connection points, retry, timeout, fake success or swallowed errors.
- Changes to the finalized backend-neutral Renderer API, Session API or Renderer Runtime Plugin contracts unless implementation reveals a proven contract defect and design is explicitly reopened.

## Further Notes

- The Renderer API, Session value API, Renderer Runtime Plugin and public facade were committed before this design began, and main was clean at that boundary. This spec consumes those final contracts rather than the earlier uncommitted drafts.
- The accepted CFlow vocabulary is maintained in the single root glossary. SVG-specific architectural decisions are recorded after the existing Renderer ADR sequence.
- SVG is reference-quality because it exercises the complete public Renderer protocol and browser lifecycle, not because it contains a product component system or the largest possible feature set.
- Stable classes and data attributes are a styling and test seam. They do not grant callers ownership of Provider-created elements or permission to mutate the Projection as a second rendering API.
- Browser rendering and input must use Target's owner document/window rather than assuming one process-global DOM, so iframe-like environments remain representable when the Target itself is valid.
- Headless Chromium provides real DOM, CTM, focus and input behavior but is still one engine. Passing these tests does not claim Safari or Firefox compatibility.
- The normal Runtime path guarantees reset before Session and resolvable Selection ordering. Direct Provider validation remains necessary because JavaScript callers can invoke the public interface without the Runtime adapter.
- The Renderer Runtime Plugin already owns authoritative resynchronization after `DOCUMENT_OUT_OF_SYNC`; the SVG Provider owns only local evidence validation, Projection and Target resources.
- The TDD implementation must preserve the agreed vertical-slice discipline. Refactoring is deferred to the subsequent dual-axis code-review loop.
