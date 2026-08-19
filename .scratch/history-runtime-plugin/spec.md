# CFlow History Runtime Plugin

**Status:** ready-for-agent

## Problem Statement

CFlow 已经有可逆的 Kernel、Activation-scoped Kernel Service 和强类型 Command Service，但 Canvas Runtime 还没有一条标准的 Document History 路径。当前 Consumer 虽然可以直接调用 TransactionContext.applyChangeSet，但没有统一的 History Entry 记录、redo 失效、Undo/Redo Command、可用性 Snapshot、observer 重入顺序或 Activation 释放语义。

如果各个 Interaction 或业务 Plugin 自建历史栈，它们会对哪些 Commit 可记录、怎样识别 replay、何时移动栈、失败后是否保留 Entry，以及 Provider 消失后是否继续接受操作得出不同答案。更危险的是，Kernel Commit Observer 允许同步重入并对后续 Commit 排队，而 Command Service 本身允许并发和重入；一个简单的 replay 布尔标记会误忽略重入生成的 Recordable Commit，而在 transact 返回后才移动栈又会破坏 revision 顺序。

首版需要一个独立发布的 History Runtime Plugin，它只记录 Document 变化，通过现有 Kernel Transaction seam replay Change Set，通过现有 Command seam 提供 Undo/Redo，并在不公开内部 Entry 的前提下向 UI 或 Adapter 提供稳定可读状态。

## Solution

新增可发布的 `@cflow/plugin-history`。`historyPlugin` 静态要求 Kernel Service 与 Command Service，并在每次 Activation 中提供一份全新的 History Service。Activation 以 Kernel 当前 revision 作为 History Baseline，不补录早于 Baseline 的 Commit。

History 订阅 Kernel Commit，将当前 Activation 观察到的每个非自身 Replay Commit 记录为 History Entry。每个 Entry 只保存原 Commit 的 Change Set。新 Recordable Commit 进入 undo 栈并清空 redo 栈。History 不按 `origin` 或 `commandId` 过滤 Commit，这两个字段仅用于诊断。

History Service 只暴露稳定 History Snapshot 与 subscribe，Snapshot 只包含 `canUndo` 和 `canRedo`。Undo 与 Redo 分别通过强类型 Command token 执行，输入为 void，输出为该次 replay 生成的 Canvas Commit。Undo 通过同步 Kernel Transaction 反向应用栈顶 Change Set，Redo 正向应用；revision 始终单调递增，不恢复旧 revision。

History 以 Activation-private pending replay 对本次 Command 与确切 Replay Commit 做关联。栈只在 Commit Observer 按 revision 消费该 Replay Commit 时移动；Command 在栈已更新后才完成。这个关联同时覆盖 transact 中的立即 Observer 投递和已处于 Kernel 分发时的延后投递，不使用 metadata 决定语义。

History 本身采用单飞 replay，不继承 Command Service 的无限并发能力。只有在没有 pending replay 且 History 已追平 Kernel 时才接受 Undo/Redo。重叠调用与 observer 尚未追平都显式失败，不排队到以后去撤销另一个栈顶。

History 仍按 revision 立即处理每个 Commit，但只在已观察 revision 与 Kernel 当前 revision 一致时发布公开 History Snapshot。同一轮 Kernel 分发中的中间状态可合并，使 History subscriber 看到的永远是与当前 Kernel 对齐的可用性。

## User Stories

1. As a CFlow maintainer, I want History to be a publishable Runtime Plugin, so that undo and redo follow the same composition model as Kernel and Command.
2. As a CFlow maintainer, I want History to require explicit Kernel and Command Services, so that it has no hidden global dependency.
3. As a CFlow maintainer, I want History to provide one narrow Runtime Service, so that consumers do not receive internal stacks or replay handles.
4. As a CFlow maintainer, I want internal packages to avoid depending on the core facade, so that the facade remains an outward aggregation layer.
5. As a CFlow maintainer, I want History to use Kernel-owned Canvas Commit and Change Set types, so that it does not create a competing change protocol.
6. As a CFlow maintainer, I want History writes to use Kernel Service transactions, so that no second writable Document authority appears.
7. As a Canvas Runtime author, I want each History Activation to own isolated state, so that separate canvases and reinstallations cannot share entries accidentally.
8. As a Canvas Runtime author, I want a History Activation to start from the current Kernel revision, so that it can attach to an already-active Kernel without inventing prior entries.
9. As a Canvas Runtime author, I want commits before the History Baseline to remain unavailable to undo, so that missing observer history is never guessed.
10. As a Canvas Runtime author, I want a new Activation to begin with `canUndo` and `canRedo` false, so that startup behavior is deterministic.
11. As a History consumer, I want every successful non-replay Canvas Commit to become a History Entry, so that direct transactions and Feature Plugin commits have the same undo behavior.
12. As a History consumer, I want commits without origin metadata to remain recordable, so that metadata omission cannot create invisible Document changes.
13. As a History consumer, I want commits without command identity metadata to remain recordable, so that History is not coupled to Command participation.
14. As a History consumer, I want origin and command identity to remain diagnostic only, so that arbitrary strings do not control History policy.
15. As a History consumer, I want net-zero and failed transactions to produce no Entry, so that History represents real committed changes only.
16. As a History consumer, I want one Canvas Commit to produce one History Entry, so that the initial undo unit follows Transaction atomicity.
17. As a History consumer, I want a History Entry to retain only its Change Set, so that History does not pin full before and after Canvas Views.
18. As a domain Plugin author, I want History to preserve opaque data references, so that it does not impose an undocumented cloning or serialization model.
19. As a domain Plugin author, I want arbitrary data to keep the Kernel immutable-value contract, so that replay equality remains consistent with normal transactions.
20. As a History consumer, I want a new Recordable Commit to clear redo, so that redo never crosses a newly created Document branch.
21. As an application author, I want Undo and Redo represented by strong Command tokens, so that interaction code uses the standard Command execution seam.
22. As an application author, I want History Service not to expose duplicate undo and redo methods, so that there is only one behavioral entry point.
23. As an application author, I want Undo and Redo to accept no domain input, so that the current History state determines the target Entry.
24. As an application author, I want Undo to return the newly created Canvas Commit, so that I can observe exact replay evidence without a second Kernel read.
25. As an application author, I want Redo to return the newly created Canvas Commit, so that downstream work can refer to the precise replay result.
26. As an application author, I want Undo to reverse the top undo Entry through a Transaction, so that normal Kernel validation still applies.
27. As an application author, I want Redo to apply the top redo Entry forward through a Transaction, so that redo follows the same validation path.
28. As an application author, I want Undo and Redo to create increasing revisions, so that observers never move backward in local revision time.
29. As an application author, I want replay metadata to use the History origin and actual execution command ID, so that diagnostics identify the behavior accurately.
30. As an application author, I want an empty undo stack to fail with a stable History error, so that the absence of work is never reported as success.
31. As an application author, I want an empty redo stack to fail with a stable History error, so that callers can distinguish the two unavailable behaviors.
32. As an application author, I want Kernel replay failures preserved unchanged, so that stale or invalid graph details are not hidden by a History wrapper.
33. As an application author, I want any failed replay to leave both stacks unchanged, so that a rejected operation cannot consume an Entry.
34. As an application author, I want any failed replay to leave the public Snapshot unchanged, so that observers never see a success state for failed work.
35. As an application author, I want cancellation checked before replay begins, so that an already-cancelled invocation cannot modify the Document.
36. As an application author, I want cancellation after a successful Kernel Commit not to rewrite the result as failure, so that command outcome agrees with Document state.
37. As a UI adapter author, I want a stable History Snapshot, so that framework adapters can use external-store subscription patterns.
38. As a UI adapter author, I want the Snapshot to expose only `canUndo` and `canRedo`, so that the first public contract does not freeze grouping or depth semantics.
39. As a UI adapter author, I want the same Snapshot root while its public booleans are unchanged, so that rendering responds only to observable state changes.
40. As a UI adapter author, I want subscribe to notify only after a public Snapshot change, so that hidden Entry count changes do not cause meaningless updates.
41. As a UI adapter author, I want subscribe not to invoke immediately, so that initial state is read explicitly through `getSnapshot`.
42. As a UI adapter author, I want unsubscribe to be idempotent, so that lifecycle cleanup is safe to repeat.
43. As a UI adapter author, I want listener failures isolated and explicitly reported, so that one adapter cannot block other History consumers.
44. As a UI adapter author, I want listener notification order deterministic, so that synchronous integrations can reason about reentrancy.
45. As a UI adapter author, I want listeners added during a notification excluded from that notification, so that one publication has a stable recipient set.
46. As a UI adapter author, I want listeners removed during a notification to finish the current recipient snapshot, so that callback mutation does not alter an in-progress publication.
47. As a History consumer, I want internal Commit processing to stay revision ordered, so that Entry order follows the authoritative Document timeline.
48. As a History consumer, I want the public Snapshot published only after History catches up to Kernel, so that it never advertises a stale action state.
49. As a History consumer, I want multiple intermediate states from one reentrant Commit drain coalesced, so that subscribers receive the final aligned availability.
50. As a maintainer, I want a revision discontinuity exposed as an invariant failure, so that missing Commit delivery is not repaired silently.
51. As a Command caller, I want only one replay in flight, so that two overlapping invocations cannot consume an ambiguous stack top.
52. As a Command caller, I want an overlapping invocation to fail with `HISTORY_BUSY`, so that History never silently queues it against later state.
53. As a Command caller, I want a call made before History catches up to fail with `HISTORY_NOT_CAUGHT_UP`, so that it cannot act on an outdated Entry order.
54. As a Command caller, I want error precedence deterministic, so that disposed, cancelled, busy, stale-observer and empty-stack states have one stable interpretation.
55. As a Command caller, I want a successful replay to complete only after History consumes its Commit, so that the resolved result and History Snapshot agree.
56. As a subscriber, I want reentrant Undo or Redo during a replay publication to see `HISTORY_BUSY`, so that the original Command completes before another replay begins.
57. As a subscriber, I want Undo during a normal aligned Commit publication to be valid, so that synchronous reactions can use the new top Entry safely.
58. As a maintainer, I want self replay identified through private operation correlation, so that diagnostic metadata never becomes a security or correctness token.
59. As a maintainer, I want immediate and queued Commit delivery both supported, so that History remains correct regardless of which Kernel Observer invoked it.
60. As a maintainer, I want unrelated reentrant Commits to remain recordable, so that a broad replay flag cannot suppress real Document changes.
61. As a Canvas Runtime author, I want either Required Service disappearing to deactivate History, so that History cannot run with a partial dependency set.
62. As a Canvas Runtime author, I want History subscribers and the Kernel Observer removed during deactivation, so that an ended Activation cannot keep receiving changes.
63. As a Canvas Runtime author, I want Undo and Redo registrations disposed and awaited, so that Command lifecycle ownership remains explicit.
64. As a Canvas Runtime author, I want old History Service calls to fail with `SERVICE_DISPOSED`, so that stale handles never appear operational.
65. As a Canvas Runtime author, I want cleanup-window Command calls to fail with `SERVICE_DISPOSED`, so that registration teardown cannot replay old state.
66. As a Canvas Runtime author, I want retained Entry references released at deactivation, so that an ended History does not pin graph data.
67. As a Canvas Runtime author, I want provider reinstallation to create a fresh History Baseline, so that old entries never migrate implicitly.
68. As a test author, I want behavior exercised through real Plugin Host, Kernel, Command and History seams, so that tests cannot disagree with production lifecycle behavior.
69. As a test author, I want observer reentrancy covered with real ordered Commit delivery, so that the most dangerous sequencing path is proven end to end.
70. As a test author, I want compile-time coverage of Commands, Snapshot and Service, so that the public type contract cannot widen accidentally.
71. As a package consumer, I want History re-exported through the core facade, so that common consumers retain one public entry point.
72. As a package consumer, I want the History package independently importable and packable, so that advanced consumers can depend on the narrow package.
73. As a maintainer, I want generated declarations free of Cordis, RxJS, Renderer and core leakage, so that package direction remains enforceable.
74. As a maintainer, I want no hidden retry, queue, timeout, compensation or fake success, so that every failed History contract remains visible.

## Implementation Decisions

- Add one publishable package named `@cflow/plugin-history` and use the same name for its official Plugin diagnostic identity.
- The package directly depends on `@cflow/kernel`, `@cflow/plugin-kernel`, `@cflow/plugin-command` and `@cflow/runtime-cordis`; it does not depend on `@cflow/core`.
- The direct Kernel dependency owns Canvas Commit and Change Set types only. All reads, writes and observation still pass through Kernel Service.
- Export `historyPlugin`, `historyService`, `undoCommand`, `redoCommand`, `HistoryError`, `HistoryService`, `HistorySnapshot` and `HistoryErrorCode`.
- Keep the official History Plugin configuration-free in the first version.
- Declare Kernel Service and Command Service as strict Required Services and provide one History Service binding.
- Create all History state inside Plugin setup so every Activation owns a fresh History Baseline, stacks, subscriber set and pending replay state.
- Read Kernel Service once during Activation setup and use that current revision as the History Baseline without creating an Entry.
- Register one Kernel Commit Observer for the Activation. Record every observed Commit except the exact Replay Commit correlated to this Activation's pending Undo or Redo.
- Do not filter Recordable Commits by origin, command identity or the presence of metadata.
- Represent each internal History Entry with the source Change Set only. Do not retain the full Canvas Commit or expose Entry values publicly.
- Keep undo and redo as LIFO collections. A Recordable Commit pushes one Entry to undo and clears redo.
- Define Undo and Redo as runtime-unique, invariant Command tokens with diagnostic IDs `history.undo` and `history.redo`.
- Both Commands take void input and produce the replay Canvas Commit.
- Do not put undo or redo methods on History Service.
- Before replay, validate the Activation, the execution signal, pending replay state, observer catch-up and stack availability in that order.
- Use stable History error codes `UNDO_EMPTY`, `REDO_EMPTY`, `HISTORY_BUSY`, `HISTORY_NOT_CAUGHT_UP` and `SERVICE_DISPOSED`.
- Include the active and requested Command IDs in busy error details, and observed and Kernel revisions in not-caught-up error details.
- Preserve Kernel errors from Change Set application, final graph validation and revision overflow as their original values.
- Check an already-aborted execution signal before starting the Transaction and preserve its reason. Once the Kernel commits, do not reinterpret later cancellation as failure or create compensation work.
- Undo opens one synchronous Kernel Service Transaction and applies the top undo Entry in reverse. Redo applies the top redo Entry forward.
- Supply replay Transaction metadata with origin `history` and the actual Command execution ID.
- Establish one Activation-private pending replay before starting the Transaction. It contains the requested direction, selected Entry and completion state.
- Support synchronous Commit observation before `transact` returns and queued observation after `transact` returns. Correlate the latter with exact Canvas Commit identity.
- Let the Commit Observer be the only place that moves an Entry between undo and redo. A replay failure therefore produces no Commit and no stack movement.
- On a matched Undo Replay Commit, move the selected Entry from undo to redo. On a matched Redo Replay Commit, move it from redo to undo.
- Clear pending replay only after aligned Snapshot subscribers have seen the completed replay state, then complete the Command with its Canvas Commit.
- If a Replay Commit has already committed but the current Activation ends before observing it, complete the in-flight Command with that exact Commit without updating or publishing the discarded History state.
- Reject another Undo or Redo while pending replay exists. Do not queue, retry or merge replay requests.
- Track the last observed revision. Require every delivered Commit's before revision to equal it before processing, and expose a discontinuity as an internal invariant failure without rebaselining.
- Reject a Command with `HISTORY_NOT_CAUGHT_UP` when the last observed revision differs from Kernel Service's current revision.
- Publish an immutable History Snapshot containing only `canUndo` and `canRedo`.
- Preserve the Snapshot root while both public values are unchanged. Entry count or identity changes alone do not publish a new Snapshot.
- Process every Commit internally, but replace the public Snapshot only when the observed revision has caught up with Kernel Service's current revision. Coalesce intermediate availability states from the same reentrant dispatch drain.
- Make History Service subscribe a future-change notification seam: it does not invoke the listener immediately, returns an idempotent unsubscribe function and asks listeners to read through `getSnapshot`.
- Snapshot the listener set at publication start, call listeners in registration order, exclude listeners added during that publication and finish the current recipient snapshot even when one unsubscribes mid-publication.
- Isolate subscriber errors, continue later subscribers and report failures through the platform error channel without changing History state.
- Close the Activation before releasing its external resources. Old Service methods and any handler reached during the cleanup window fail with `SERVICE_DISPOSED`.
- Stop Kernel observation, dispose and await both Command registrations, then release retained entries and pending state.
- Let the Plugin Host withdraw History Service and deactivate downstream consumers according to existing Required Service lifecycle ordering.
- Reinstallation creates a new empty History at the then-current Kernel revision. No Entry, subscriber or pending replay crosses Activations.
- Re-export the complete public History seam from `@cflow/core`; internal packages continue to import their direct dependencies rather than core.
- Keep opaque Node and Edge data under the existing Kernel immutable-value contract. History does not deep-copy, deep-freeze, traverse or serialize it.

## Testing Decisions

- Test through the highest agreed seam: real Plugin Host installations using the official Kernel, Command and History Plugins and their public Runtime Services.
- Do not mock Canvas Kernel, Kernel Service, Command Service, Commit dispatch, Plugin Host lifecycle, internal stacks or pending replay state.
- Follow vertical red-to-green slices: add one public behavior test, observe the expected failure, implement only enough behavior to pass, then proceed to the next slice.
- Use public History Snapshot, returned Canvas Commit, Kernel read values, Command execution results and structured errors as observations. Do not inspect private collections or internal flags.
- Follow the existing Kernel Plugin and Command Plugin tests as prior art for activation helpers, real provider/consumer composition, synchronous observer reentrancy, error identity and lifecycle reinstallation.
- Start with a tracer test that activates all three Providers, observes an empty History Snapshot, commits one graph change and undoes it through Command Service.
- Add behavior coverage for a non-zero History Baseline and prove that pre-Baseline commits are not undoable.
- Add coverage for direct Transactions, Command-originated Transactions, missing metadata and diagnostic metadata to prove all non-replay commits are recordable.
- Prove one Recordable Commit creates one Entry indirectly through the sequence of available Undo and Redo operations, without exposing stack depth.
- Prove new Recordable work after Undo clears redo.
- Assert Undo and Redo return the exact replay Canvas Commit with increasing revision, correct before and after Views, exact Change Set and diagnostic metadata.
- Assert self Replay Commits do not become new History Entries.
- Assert unrelated Commits created during replay dispatch remain recordable and correctly clear redo.
- Cover empty undo and redo errors, busy replay, not-caught-up observer reentrancy and disposed Service behavior with stable codes and readonly details.
- Prove through reachable History failures, including cancellation and availability errors, that rejected Commands do not change stack availability, Snapshot identity or subscriber deliveries.
- Keep Kernel Change Set conflict and final graph replay atomicity covered at the existing real CanvasKernel seam. Do not add a fake Kernel Service merely to force a replay error that a caught-up strict-LIFO History cannot construct through supported behavior; History must leave Kernel errors uncaught and unwrapped.
- Cover caller cancellation before replay and prove no Kernel revision changes. Cover cancellation after the commit point and prove the successful commit remains the Command result.
- Cover stable Snapshot root identity, no notification for hidden Entry changes, coalesced publication after observer catch-up and deterministic subscriber reentrancy.
- Cover subscriber add/remove during publication, idempotent unsubscribe and error isolation through the platform reporting path.
- Cover both correlation paths: immediate replay Commit observation and replay initiated from an existing Commit notification whose delivery is queued.
- Cover deterministic failure precedence when more than one unavailable condition is present.
- Cover loss and reinstallation of each Required Service, old Service failure, Command unregistration, retained Kernel baseline behavior and fresh History state.
- Add compile-time tests for readonly History Snapshot, exact Service surface, invariant void-to-CanvasCommit Command types and configuration-free Plugin installation.
- Add declaration checks that reject raw Cordis, RxJS, Renderer and `@cflow/core` imports or leaked types from the History package.
- Add package-name import probes for the narrow History package and a small core facade re-export smoke test instead of duplicating behavior tests through core.
- Verify package and repository typecheck, tests, formatting, build, declaration checks, package dry-run packing and diff whitespace checks before completion.

## Out of Scope

- Capacity limits, eviction, bounded memory policy or configurable history size.
- History grouping, transaction merging, temporal batching or compound commands.
- Persistent History, serialized entries, hydration, import, export or migration.
- Yjs, CRDT-aware undo managers, collaboration merge authority or remote History.
- Undo or redo UI, menus, keyboard shortcuts, toolbar contributions or framework adapters.
- Clear History Command or public imperative clear method.
- Public History Entry arrays, stack depth, labels, timestamps, descriptions or inspection APIs.
- Recordability configuration by origin, command identity, entity type or Plugin.
- Selective undo, branching History trees, jumping to an Entry or restoring an old revision number.
- Command-specific inverse handlers or compensating business effects.
- Undo of Session State, Selection, Viewport, Interaction previews, Renderer state or external side effects.
- Asynchronous Transaction, replay retry, replay queue, timeout, fallback, hidden compensation or fake success.
- Deep cloning, JSON-safe validation, structured cloning or deep freezing of arbitrary domain data.
- Changes to Kernel Change Set, Kernel Service observer ordering, Command Service concurrency or Plugin Host lifecycle contracts.
- A default Canvas Composition, preset, Renderer or complete editor UI.

## Further Notes

- The agreed primary test seam is the real Plugin Host composition of Kernel, Command and History. This was confirmed before specification publication and satisfies the TDD requirement to test only pre-agreed public seams.
- Kernel already guarantees atomic forward and reverse Change Set application, source-side matching, final graph validation and monotonically increasing revision. History coordinates these guarantees rather than reimplementing them.
- Kernel Service dispatches Commits synchronously and queues observer-reentrant Commits until every Observer has seen the current revision. History must consume the callback Commit itself and must not reconstruct an Entry from a later `read()`.
- Command Service invokes synchronous handler work in the current call stack but exposes a Promise result and permits concurrent or reentrant executions. History deliberately narrows that behavior for replay through accepted single-flight semantics.
- History Snapshot publication waits for observer catch-up because an earlier Kernel Observer can already have committed a queued later revision while History is still processing the current callback.
- In a caught-up strict-LIFO History, a stale top Entry is not constructible through supported public behavior: every later Recordable Commit becomes the newer undo Entry or clears redo. Kernel's own public tests remain the source of truth for Change Set conflict and final-graph failure atomicity; History must not introduce a fake dependency merely to duplicate those unreachable paths.
- The public package name is `@cflow/plugin-history`, matching the implemented Kernel and Command Runtime Plugin naming convention. Older target documentation that mentions `@cflow/history` is not the selected first-version package name.
- The accepted domain vocabulary is recorded in the CFlow glossary. Single-flight replay and caught-up Snapshot publication are recorded as accepted architectural decisions.
