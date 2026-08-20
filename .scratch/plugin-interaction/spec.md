# CFlow Interaction Runtime Plugin

**Status:** ready-for-agent

## Problem Statement

CFlow 已经能用 Renderer 把 Document 与 Session 投影为可见画布，并从真实后端发布标准化 Renderer Input 与 Hit Result，但尚没有将这些事实解释为选择、平移、缩放和 Node Drag 的官方 Runtime 能力。调用方目前只能自行处理 Pointer、Wheel、Keyboard、Focus、Hit Test、Pointer Capture、Session 写入和 Command 提交，容易把后端对象、高频 Preview 或第二条 Document 写路径泄漏进入公共架构。

现有 Renderer 只能接受稳定 Document 与 Session 状态。如果 Node Drag 的每个 pointermove 都写 Kernel，就会制造大量 Commit 与 History Entry；如果写 Session，又会污染只应容纳 Selection 和稳定 Viewport 的本地视图状态。没有 CFlow-owned Interaction Projection 通道时，可见 Preview 只能绕过 Renderer seam 直接操作 DOM、SVG 或其他 Provider 对象。

此外，真实输入还存在单 Gesture Pointer、额外 Pointer、意外丢失 Capture、Focus 丢失导致 keyup 缺失、依赖重载、拖动期间外部 Commit、Projection 与稳定状态交付顺序、同步恢复失败等必须公开定义的语义。这些语义不能依赖 silent ignore、timeout、后端特例或 fake success。

## Solution

新增 backend-neutral 的 `@cflow/interaction-api` 和 Runtime Feature Plugin `@cflow/plugin-interaction`。Interaction Plugin 静态依赖 Renderer、Session、Command 与 Kernel Service，将 Renderer Input 与 Hit Result 解释为内建 select/pan 状态机。它拥有唯一 Active Gesture 与 Gesture Preview，通过排他的 Interaction Projection Binding 向 Renderer 交付不可变候选几何；Renderer 以 Document、Session 与最新 Projection 合成 Effective Renderer State。

首版提供 Node/Edge/Canvas 选择、Additive Modifier 多选、Canvas/middle/Space 平移、按 Screen Point 锚定的 Wheel Zoom，以及单个或多个已选 Node 的 Drag Preview。Node Drag 只在 pointerup 通过强类型 Move Nodes Command 执行一次同步 Kernel Transaction，因而自然形成至多一个可撤销 History Entry。Viewport Pan 只在 pointerup 一次写入 Session；Wheel 则是独立的 Session transition。

Renderer API 增加 Interaction Projection 与逻辑 Focus Input，Renderer Runtime Plugin 拥有排他 Binding、Projection Baseline 协调、reset 清理和单次恢复。SVG Provider 在现有 keyed 语义几何上应用 Preview，不建立 ghost DOM、副本节点或第二套场景树，并用真实 Chromium 验证 Pointer、Wheel、Keyboard、Focus、Capture、Hit Test、Preview、Commit 与 History 的完整闭环。

## User Stories

1. As a Canvas user, I want to click a Node to select it, so that I can act on the intended graph entity.
2. As a Canvas user, I want to click an Edge to select it, so that edge selection follows the same Session model as Node selection.
3. As a Canvas user, I want to click blank Canvas space to clear Selection, so that deselection is predictable.
4. As a Canvas user, I want additive clicks to toggle Selection membership, so that I can build a multi-selection without ordering semantics.
5. As a Canvas user, I want Shift, Meta, and Control to share Additive Modifier semantics, so that selection works without a platform-specific command-key contract.
6. As a Canvas user, I want Alt excluded from Additive Modifier semantics, so that it remains available for future distinct behavior.
7. As a Canvas user, I want an additive Canvas click to preserve Selection, so that blank space does not unexpectedly erase a multi-selection.
8. As a Canvas user, I want clicking an already selected Node in a multi-selection to preserve the group until the gesture is classified, so that I can drag the group.
9. As a Canvas user, I want a click without drag on one selected Node to collapse the multi-selection to that Node, so that plain click remains a replacement action.
10. As a Canvas user, I want a Port Hit Result to select its owning Node in the first version, so that unsupported edge connection is not fabricated.
11. As a Canvas user, I want Edge and Port clicks to remain non-draggable, so that unsupported gestures do not start accidentally.
12. As a Canvas user, I want a point outside the Renderer Target to leave Selection unchanged, so that unrelated page input is not treated as Canvas input.
13. As a Canvas user, I want small pointer movement to remain a click, so that hand jitter does not start a drag.
14. As a Canvas user, I want movement beyond a documented Screen Point threshold to become a drag exactly once, so that gesture classification is stable.
15. As an application author, I want the drag threshold expressed in CSS logical pixels, so that zoom and device pixel ratio do not alter click behavior.
16. As an application author, I want the drag threshold configurable, so that product ergonomics can be tuned explicitly.
17. As a Canvas user, I want an unselected Node drag to select and move only that Node, so that direct manipulation has an obvious target.
18. As a Canvas user, I want dragging a selected Node to preview all selected Nodes together, so that group movement preserves the current Node membership.
19. As a Canvas user, I want selected Edges to remain selected but not move as independent entities, so that Edge geometry continues to derive from Nodes.
20. As a Canvas user, I want Node Drag to display candidate positions before commit, so that pointermove remains responsive without modifying Document.
21. As a Canvas user, I want incident Edges to follow Node Drag Preview, so that visible graph geometry stays coherent.
22. As a Canvas user, I want pointerup to commit all dragged Nodes atomically, so that partial group movement is impossible.
23. As a Canvas user, I want one Node Drag to create at most one History Entry, so that Undo reverses the gesture as one action.
24. As a Canvas user, I want a net-zero Node Drag to create no Commit, so that History contains no meaningless action.
25. As a Canvas user, I want Undo and Redo to restore the complete group movement, so that interaction and History form a closed loop.
26. As a Canvas user, I want blank Canvas primary drag to pan, so that navigation works without changing tools.
27. As a Canvas user, I want middle-button drag over any target to pan, so that navigation remains available over Nodes and Edges.
28. As a Canvas user, I want Space plus primary drag to pan over any target, so that keyboard-assisted navigation is available without a public Tool mode.
29. As a Canvas user, I want an established Pan to continue after Space is released, so that gesture kind cannot change midway.
30. As a Canvas user, I want Pan Preview to avoid stable Session writes during pointermove, so that transient movement remains outside Session.
31. As a Canvas user, I want pointerup to publish one final Viewport, so that the stable Session reflects the completed Pan.
32. As a Canvas user, I want pointer cancellation to discard Pan Preview, so that an interrupted Pan does not change stable Viewport.
33. As a Canvas user, I want Wheel input to zoom around the pointer Screen Point, so that the content under the pointer remains visually anchored.
34. As a Canvas user, I want Wheel Zoom bounded by explicit minimum and maximum values, so that Viewport stays usable.
35. As a Canvas user, I want equivalent bounded Wheel input not to notify Session, so that no-op input remains a no-op.
36. As an application author, I want zoom sensitivity and bounds configurable by Interaction, so that Session does not own product policy.
37. As an application author, I want malformed Interaction config rejected without coercion, so that invalid product policy fails visibly.
38. As an application author, I want unknown config fields rejected, so that typos do not appear operational.
39. As an Interaction author, I want one Active Gesture controlled by one Gesture Pointer, so that state transitions remain deterministic.
40. As an Interaction author, I want an additional Pointer rejected without cancelling or replacing the current gesture, so that unsupported multi-pointer input is explicit.
41. As an Interaction author, I want rejected Pointer movement ignored until its terminal input without repeated diagnostics, so that observability does not become noisy.
42. As an Interaction author, I want captured Pointer movement outside the Target to continue the gesture, so that dragging survives boundary crossing.
43. As an Interaction author, I want native pointer cancellation to end the gesture without a stable result, so that platform interruption is safe.
44. As an Interaction author, I want unexpected lost pointer capture normalized as one semantic cancellation, so that a gesture cannot remain active invisibly.
45. As an Interaction author, I want normal up, cancel, and explicit release not to emit duplicate cancellation, so that terminal transitions occur once.
46. As an Interaction author, I want Focus changes represented by CFlow values, so that keyboard state does not depend on DOM objects.
47. As an Interaction author, I want focus loss to clear pressed-key state, so that a lost Space keyup cannot leave Pan activation stuck.
48. As an Interaction author, I want focus loss not to cancel an already captured pointer gesture, so that logical focus and Pointer Capture remain distinct.
49. As an Interaction author, I want Wheel rejected during an Active Gesture, so that stable Viewport cannot invalidate an in-progress Preview silently.
50. As an Interaction author, I want Keyboard input during a gesture to maintain key state without changing gesture kind, so that the state machine is linear.
51. As an Interaction author, I want idle pointermove to produce no Hover state in the first version, so that unsupported preselection is not implied.
52. As a Canvas user, I want a drag to continue across unrelated Document commits, so that unrelated work does not cancel my action.
53. As a Canvas user, I want Node data and size changes preserved during drag, so that position commit cannot overwrite other fields.
54. As a Canvas user, I want a competing position change to cancel my stale drag, so that one gesture cannot overwrite another location write.
55. As a Canvas user, I want deletion of a dragged Node to cancel the entire group drag, so that movement never partially commits.
56. As a Canvas user, I want an external Viewport update to cancel an in-progress Pan, so that stale Viewport Preview cannot overwrite newer state.
57. As a Command caller, I want Move Nodes input to carry each Node's base and target positions, so that conflict evidence is local to affected entities.
58. As a Command caller, I want malformed, duplicate, unsorted, empty, or non-finite movement rejected, so that the public Command contract is deterministic.
59. As a Command caller, I want missing or position-conflicting Nodes reported as a Stale Gesture, so that concurrency failure is distinguishable from malformed input.
60. As a Command caller, I want unrelated revisions not to reject movement, so that global revision churn does not create false conflicts.
61. As a Command caller, I want Move Nodes to preserve current complete Node values, so that stale captured shells cannot overwrite data, size, or hierarchy.
62. As a History consumer, I want Move Nodes to use one synchronous Transaction, so that its Change Set is naturally reversible.
63. As a Renderer author, I want Interaction Projection defined outside Runtime, so that Provider contracts do not depend on Plugin lifecycle.
64. As a Renderer author, I want Projection values contain only IDs, Point, and Viewport semantics, so that backend objects cannot cross the seam.
65. As a Renderer author, I want every non-null Projection validated and copied on acceptance, so that forged JavaScript mutation cannot rewrite Effective Renderer State.
66. As a Renderer author, I want a null Projection update to clear Preview idempotently, so that cleanup is safe to repeat.
67. As a Renderer author, I want malformed Projection rejected before state changes, so that failed updates are all-or-throw.
68. As a Renderer author, I want Projection Baseline mismatch distinct from malformed Projection, so that callers can diagnose stale state accurately.
69. As a Renderer author, I want one exclusive Interaction Projection Binding, so that multiple Consumers cannot overwrite each other's Preview.
70. As a Renderer author, I want a second live Binding rejected, so that ownership conflicts surface immediately.
71. As a Renderer author, I want disposed Binding updates rejected, so that stale owners cannot resume writing.
72. As a Renderer author, I want failed Binding cleanup retain its reservation, so that residual Preview cannot overlap a new owner.
73. As a Renderer author, I want Document reset to clear Interaction Projection, so that a new Baseline never inherits stale Preview.
74. As a Renderer author, I want display, Hit Test, and subsequent Input coordinates derived from Effective Renderer State, so that visible and semantic geometry agree.
75. As a Renderer author, I want Viewport Pan Preview to affect subsequent World Point conversion, so that input coordinates match the displayed Viewport.
76. As a Renderer author, I want invalidating Document or Session updates clear Projection before stable state delivery, so that no mixed baseline is visible.
77. As a Runtime author, I want one explicit full recovery after an internal synchronization fault, so that recoverable loss uses the authoritative current state.
78. As a Runtime author, I want failed recovery enter a terminal Renderer Sync Failure, so that the system does not pretend to remain interactive.
79. As a Runtime author, I want Input forwarding stopped after Renderer Sync Failure, so that stale geometry cannot receive user behavior.
80. As a Runtime author, I want no retry loop or timeout around Renderer recovery, so that failure remains visible and bounded.
81. As an SVG consumer, I want Node Drag Preview to preserve keyed DOM identity, so that incremental observation and styling remain stable.
82. As an SVG consumer, I want Viewport Pan Preview reuse the existing Projection transform, so that no second scene hierarchy appears.
83. As an SVG consumer, I want Preview clear to restore committed geometry, so that cancelled gestures leave no residual display state.
84. As an SVG consumer, I want caller styles and Selection markers preserved through Preview, so that Interaction does not become a theme system.
85. As an SVG consumer, I want no ghost Node, animation, dragging marker, or Interaction layer in the first version, so that visible semantics stay minimal.
86. As a Plugin author, I want Interaction cleanup to stop input before clearing state, so that teardown cannot accept new work reentrantly.
87. As a Plugin author, I want Interaction cleanup to release active capture and Projection before dependencies disappear, so that Provider resources are available for cleanup.
88. As a Plugin author, I want cleanup continue after individual failures and aggregate every error, so that no resource is skipped silently.
89. As a Plugin author, I want dependency recovery create a fresh idle Interaction Activation, so that old Gesture and key state cannot leak across lifecycle generations.
90. As a Plugin author, I want late Promise continuations prevented from writing state after Activation end, so that asynchronous observation cannot revive a stale gesture.
91. As a diagnostics consumer, I want rejected additional Pointers observable with a stable event, so that unsupported concurrency is not silently ignored.
92. As a diagnostics consumer, I want rejected Wheel input observable separately from faults, so that expected input arbitration is searchable.
93. As a diagnostics consumer, I want Stale Gesture cancellation observable without Fault reporting, so that expected concurrency is not misclassified as infrastructure failure.
94. As a diagnostics consumer, I want unexpected Command rejection reported exactly once, so that contained failures remain actionable.
95. As a diagnostics consumer, I want event attributes exclude graph IDs, positions, Selection, Projection, and config values, so that diagnostics stay bounded and safe.
96. As a package consumer, I want Interaction API and Plugin independently publishable, so that value contracts and Runtime behavior remain separable.
97. As a package consumer, I want backend-neutral Interaction exports available through core, so that common composition uses one facade.
98. As a package consumer, I want concrete SVG remain outside core, so that selecting Interaction does not select a Renderer backend.
99. As a maintainer, I want public declarations free of DOM and native event leakage, so that backend neutrality is mechanically verified.
100. As a maintainer, I want successful Interaction behavior proven with real Chromium and real Runtime services, so that fake collaborators cannot certify the primary path.
101. As a maintainer, I want structural and recovery faults injected only at public seams, so that tests remain stable across internal refactors.
102. As a maintainer, I want each implementation slice start with one failing public behavior test, so that the feature grows through red-green tracer bullets.

## Implementation Decisions

- Add `@cflow/interaction-api` as a backend-neutral pure-value package for Interaction Projection contracts.
- Let Interaction API depend only on the Kernel and Session value contracts needed for Node IDs, Points, and Viewport.
- Keep Interaction API independent from Renderer, Runtime, Plugin Host, DOM, and concrete Providers.
- Add `@cflow/plugin-interaction` as a Runtime Feature Plugin named `@cflow/plugin-interaction`.
- Require Renderer, Session, Command, and Kernel Service statically; provide no Interaction Runtime Service.
- Export the Interaction Plugin, readonly Interaction config, Move Nodes Command, InteractionError, error codes, and stable diagnostic event catalog.
- Re-export Interaction API and Plugin Interaction from core; do not re-export SVG.
- Keep one Active Gesture and one Gesture Pointer per Interaction Activation.
- Own Active Gesture and Gesture Preview in Interaction, never in Renderer, Session, or Kernel.
- Represent Preview as a complete immutable Interaction Projection replacement or null clear, not as a stream of deltas.
- Limit first-version Projection variants to Node Drag and Viewport Pan.
- Represent Node Drag Preview with canonical unique Node IDs, base positions, and absolute candidate positions.
- Represent Viewport Pan Preview with a base Viewport and absolute candidate Viewport.
- Use the narrow Projection Baseline rather than global Document revision or full Session Snapshot.
- Extend CanvasRenderer with synchronous, all-or-throw Interaction Projection acceptance.
- Extend Renderer Service with an exclusive Interaction Projection Binding rather than a shared direct update method.
- Permit only one live Binding per Renderer Activation; retain reservation after incomplete Binding cleanup.
- Add structured Renderer Plugin failures for binding conflict, disposed Binding, and terminal synchronization failure.
- Make every Document reset atomically clear Interaction Projection.
- Let Renderer Runtime Plugin coordinate Document, Session, and Interaction state and clear incompatible Projection before stable updates.
- Attempt one explicit current Document reset plus Session recovery after an internal state-sync failure that cannot be returned to its caller.
- Enter terminal Renderer Sync Failure after recovery failure; stop Input forwarding and reject Interaction controls until a new Activation.
- Define Effective Renderer State as accepted Document plus accepted Session plus latest Interaction Projection.
- Use Effective Renderer State for display, Hit Test, and subsequent Input World Point conversion.
- Keep Viewport Pan calculations based on Screen delta even though its Preview changes effective World Point conversion.
- Extend Renderer Input with backend-neutral focus gained and focus lost values.
- Clear pressed-key state on focus lost without cancelling a captured Active Gesture.
- Normalize unexpected lost pointer capture into exactly one semantic pointer cancellation.
- Suppress duplicate cancellation caused by normal up, cancel, explicit release, or disposal.
- Perform eligible pointer-down operations in the order: validate policy, Hit Test, Focus, Capture, establish Active Gesture, then immediate Selection transition.
- Complete cleanup before rethrowing any input callback failure.
- Use four CSS pixels as the default drag threshold and compare Euclidean Screen distance from pointerdown.
- Make threshold finite, non-negative, configurable, and irreversible once crossed for one gesture.
- Replace Selection immediately when plain pointerdown hits an unselected Node after successful capture.
- Preserve multi-selection when pointerdown hits a selected Node; collapse on click or drag all selected Nodes after threshold.
- Treat Shift, Meta, or Control as Additive Modifier; additive Node/Edge/Port input is click-only.
- Treat Port as its owning Node for first-version click selection without starting drag or connection.
- Clear Selection on plain Canvas click and preserve it on additive Canvas click.
- Leave Selection unchanged for target-exterior null Hit Result.
- Start Viewport Pan from primary Canvas drag, middle-button drag over any target, or focused Space plus primary drag.
- Keep the established gesture kind until terminal input regardless of later key changes.
- Reject Wheel and additional Pointer input during an Active Gesture with stable diagnostics rather than silent ignore.
- Keep idle pointermove, Hover, and preselection out of the first version.
- Treat Wheel as an independent Session transition rather than an Active Gesture.
- Compute Wheel Zoom exponentially from normalized deltaY and anchor it to the input Screen and World Points.
- Default zoom sensitivity to 0.002 and bounds to 0.1 through 8; let Interaction config override them.
- Ignore deltaX in the first version and do not change Wheel semantics based on Control or Meta.
- Reject unknown or invalid Interaction config without coercion; freeze the complete effective config per Activation.
- Export one typed Move Nodes Command with diagnostic ID `interaction.nodes.move` and output `CanvasCommit | null`.
- Register and own the Command in Interaction Activation.
- Require non-empty, canonical, unique moves with finite base and target positions.
- Reject malformed movement as `INVALID_MOVE` and missing or position-conflicting targets as `STALE_GESTURE`.
- Read the current complete Node inside one synchronous Transaction and replace only its position.
- Preserve unrelated commits and current non-position Node fields; never auto-rebase a position delta.
- Clear Preview and enter idle before committing Node positions or final Viewport.
- Let one Transaction produce at most one natural History Entry; do not define a command-specific inverse.
- Treat Stale Gesture as observable expected cancellation; report other input-driven Command rejection through the Host Fault Reporter.
- Keep direct API and Command structural failures on the caller path without duplicate diagnostics.
- Use domain `interaction` with `INVALID_CONFIG`, `INVALID_MOVE`, and `STALE_GESTURE`.
- Add Renderer errors `INVALID_INTERACTION_PROJECTION` and `INTERACTION_OUT_OF_SYNC`.
- Preserve original Provider, DOM, callback, and external error identity.
- Use stable diagnostic names for pointer rejection, input rejection, gesture cancellation, and command fault.
- Limit diagnostic attributes to stable input type, gesture type, and reason; exclude IDs, positions, Selection, Projection, and config.
- Make Interaction input processing synchronous and rely on Renderer BFS ordering rather than adding a second queue.
- Move internal state to a reentrancy-safe state before invoking Renderer, Session, Command, or Kernel services.
- Keep Move Nodes handler synchronous; do not add an Interaction committing state for the Promise wrapper.
- Guard Promise continuations by Activation generation so they cannot write after cleanup.
- Stop subscriptions, clear Binding, release capture, clear local state, and await Command Registration during composite cleanup.
- Continue every cleanup step after failure and aggregate errors.
- Recreate fresh config, state, Binding, subscriptions, and Command Registration after dependency recovery.
- Update SVG Provider by overriding existing keyed semantic geometry and root transform rather than creating ghost or overlay DOM.
- Preserve SVG entity DOM identity, order, Selection attributes, and caller styling during Preview.
- Recompute incident Edge geometry from candidate Node positions and current accepted Node geometry.
- Apply Projection updates with complete preflight, defensive copies, and existing DOM mutation rollback semantics.
- Keep all native Focus, lost capture, Pointer, Wheel, and Keyboard objects inside the SVG Provider.

## Testing Decisions

- Test behavior through agreed public seams; never assert private queues, gesture objects, binding tables, config parsers, or DOM journals.
- Use three pre-agreed seams: the complete real Runtime composition in Chromium for successful Interaction behavior, direct CanvasRenderer for Provider protocol, and controlled public Provider failures only for structural or recovery fault injection.
- Do not use a fake Renderer to prove successful selection, drag, pan, zoom, Focus, Capture, Hit Test, commit, or History behavior.
- Use Bun tests for pure value/type contracts, configuration validation, worked coordinate examples, Selection transitions, Move input validation, and state-machine cases that do not claim backend success.
- Use real Plugin Host dependency and lifecycle behavior rather than mocking Runtime services.
- Use real Chromium with SVG Provider for native Pointer, touch, Wheel, Keyboard, Focus, lost capture, target-exterior capture, Projection DOM, Hit Test, and input-coordinate behavior.
- Compose real Kernel, Command, Session, Renderer, Interaction, History, and SVG in the authoritative browser tracer.
- Start each vertical slice with one failing public behavior test, add only enough implementation to pass, then move to the next slice.
- Keep expected values as independent literals and worked examples rather than recomputing them with the production formula.
- Verify plain and additive Node, Edge, and Canvas selection; keep Port mapping as a pure state transition because SVG has no Port Geometry.
- Verify below-threshold click, threshold crossing, unselected Node drag, selected group drag, incident Edge Preview, and DOM identity.
- Verify clear-before-commit, one Commit, one History Entry, Undo, Redo, and net-zero movement.
- Verify primary Canvas, middle-button, and Space-assisted Pan plus cancellation and final Session update.
- Verify Wheel anchor, sensitivity, bounds, and equivalent no-op identity.
- Verify Effective Renderer State through visible geometry, Hit Test, and subsequent Input World Points.
- Verify real pointer cancellation, unexpected lost capture, focus loss with missing keyup, and movement outside Target under capture.
- Verify additional Pointer and Wheel rejection during Active Gesture without duplicated diagnostics.
- Verify unrelated commits, Node data/size changes, Node position conflict, deletion, external Viewport change, and pointerup race.
- Verify Binding exclusivity, stale Binding and Service errors, cleanup reservation, forged Projection, and post-acceptance caller mutation.
- Verify one recovery success and terminal Renderer Sync Failure after recovery failure.
- Verify dependency loss, Interaction unload during a gesture, fresh reactivation, complete cleanup, and late Promise suppression.
- Verify diagnostic and Fault reporting exactly once with safe attributes and original error identity.
- Verify type declarations and package boundaries for Interaction API, Plugin Interaction, Renderer API, Renderer Plugin, SVG Provider, and core.
- Verify Interaction API contains no Runtime, Renderer, DOM, or concrete Provider types; Plugin Interaction contains no DOM, SVG, concrete Provider, or core dependency.
- Verify package-name imports, dry-run package contents, browser tests in the root completion gate, repository check, formatting, diff check, and final status scope.
- Use existing Kernel, Command, Session, Renderer Plugin, History, Layout command, and SVG real-browser tests as prior art for immutable values, Runtime composition, reentrant ordering, typed Command commit, recovery, and native input.

## Out of Scope

- Tool, gesture, Renderer, or Interaction Provider registries and dynamic contribution systems.
- A public InteractionService, persistent public select/pan mode, or product Tool control plane.
- Box selection, delete behavior, edge connection, Port Geometry, or Port Hit implementation.
- Snapping, grid, alignment guides, Edge Routing, or connection Preview.
- Pinch, multi-touch Gesture interpretation, pressure, tilt, coalesced Pointer data, or gesture arbitration beyond rejecting additional Pointers.
- Hover, preselection, context-menu behavior, generic shortcut registry, or keyboard navigation.
- HTML overlay, foreignObject product nodes, text editing, IME, clipboard, or drag-and-drop.
- Animation, transitions, ghost Nodes, drag styling markers, or a dedicated Interaction SVG layer.
- Collaboration presence, remote cursor, multi-view Gesture coordination, or automatic conflict rebasing.
- React, Vue, Svelte, Toolbar, Inspector, Minimap, or other product UI.
- Automatic retry loops, timeout-based cleanup, guessed input state, silent fallback, or fake success.
- Changing History grouping or adding a command-specific inverse format.
- Making SVG the default Renderer or exporting it through core.

## Further Notes

- The agreed public testing seams were confirmed during design before this spec was published.
- The design consumes the accepted Interaction ADR sequence beginning with separation of Interaction values from Runtime and ending with reset/recovery behavior.
- Existing Renderer decisions that limited Input to Pointer/Wheel/Keyboard and prevented Renderer Service state updates are deliberately refined by the accepted Focus Input and Interaction Projection decisions.
- The first-version goal is one real end-to-end SVG Canvas path: select, pan, wheel zoom, preview a Node drag, commit it once, undo, redo, cancel safely, and release all resources.
- The working checkout used to publish this spec is based on the completed SVG Renderer commit. A newer documentation-site-only main commit adds no Interaction ADR or contract, but implementation work must align with current main before its first code slice.
