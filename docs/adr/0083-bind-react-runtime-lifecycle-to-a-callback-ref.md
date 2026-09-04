---
status: accepted
---

# 通过 callback ref 绑定 React Runtime 生命周期

NodeBraid 将 `@nodebraid/adapter-react` 发布为一个 React-only adapter，公开一个
`useRuntimeMount()` Hook 与具名的 Kernel、Session、History Snapshot Hooks。应用向
`useRuntimeMount()` 注入 target-specific async Runtime Factory 与生命周期 Failure
Reporter；Hook 返回稳定 callback ref，以及 `pending`、`ready`、`failed` 的不可变
Runtime Mount Snapshot。Target 或 Factory identity 改变会建立新的 generation；旧
generation 先失去发布资格，迟到的 Runtime 必须释放，后继 Factory 必须等待旧 Factory
与 Runtime dispose 完整结束。Runtime dispose failure 保留原始错误、通过 Reporter
显式暴露，并使该 Hook instance 进入不能继续获取资源的终态，不能假设 Renderer Target
Reservation 已经释放。

React effect cleanup 不能异步等待，因此本决定中的确定性 dispose 指每份成功返回的
Runtime 最多释放一次、Strict Mode setup/cleanup/setup 与普通重挂载严格串行、后继
Factory 不越过旧清理；它不声称 React unmount 会返回可等待的 Promise。当前真实
Examples Factory 没有 cooperative cancellation seam，所以 v0 不向 Factory 传递
`AbortSignal`：竞态取消只撤销过期结果的发布资格，并在结果到达后释放 Runtime，不用
timeout 或 silent fallback 猜测 Factory 状态。Factory 自己仍负责 reject 前的部分初始化
回滚。

设计阶段比较了三种足够不同的 Interface：

- 显式 Runtime Mount Resource 与 Lease 可以让命令式 caller 等待 dispose，但 React
  caller 仍需重复 effect、lease 与 remount ownership，削弱 module 的 depth 与 locality。
- 单一 `useNodeBraidSnapshot()` overload 加上极简 Mount Hook 的 callable 数量最少，但会
  在 implementation 中按 Service shape 做运行时分类，并把 Kernel、Session、History
  三种领域 seam 藏进一个模糊入口。
- callback-ref Mount Hook 加三个具名 Snapshot Hook 让常见 caller 只连接 Factory、ref
  与状态分支，同时保持各稳定 Service 的读取和订阅语义显式。

因此选择第三种。Snapshot Hooks 只把现有 `read()` / `observeCommits()` 或
`getSnapshot()` / `subscribe()` 映射到 `useSyncExternalStore`；不复制、合并或写入状态，
不制造 optional Service Snapshot，也不加入 selector。`ready` caller 通过子 React
module 使用这些 Hooks，以维持 Hook 顺序。Adapter 保持泛型 Target 与 Runtime，不依赖
DOM、Renderer Provider、Cordis implementation、`@nodebraid/core` facade 或 Examples
Application。

删除该 package 后，Factory generation、Strict Mode 重挂载、迟到结果处理、串行
create/dispose、终态清理 Failure reporting，以及三套 `useSyncExternalStore` wiring 都会
重新散落到每个 React caller；而 Plugin composition、产品 UI、Clipboard、Document 写入
与 Renderer JSX 不会移动进来。这个 deletion test 确认了 seam 的实际 depth，也排除了
Provider、Context、React Node Component、受控 Document、写入代理、Tool Registry、
Persistence、Vue Adapter 和产品 UI。
