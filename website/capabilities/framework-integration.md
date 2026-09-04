---
title: Framework Integration
description: 将 NodeBraid Runtime 生命周期与稳定 Snapshot 接入 UI 框架，同时保留 Document 与 Renderer 的职责边界。
---

# Framework Integration

Framework Adapter 位于应用 UI 框架与 Canvas Runtime 之间。它负责框架生命周期绑定和只读
状态投影，不选择 Renderer Provider、不创建第二份 Document authority，也不把产品 UI
纳入 Runtime。

## 当前能力

| Package                                                | 当前职责                                             |
| ------------------------------------------------------ | ---------------------------------------------------- |
| [`@nodebraid/adapter-react`](/modules/adapter-react)   | async Runtime mount、Strict Mode、竞态取消与 dispose |
| [`@nodebraid/plugin-kernel`](/modules/plugin-kernel)   | 提供稳定 Canvas View 读取与 Commit 订阅              |
| [`@nodebraid/plugin-session`](/modules/plugin-session) | 提供稳定 Selection/Viewport Snapshot 与订阅          |
| [`@nodebraid/plugin-history`](/modules/plugin-history) | 提供稳定 Undo/Redo 可用性 Snapshot 与订阅            |

React Adapter 通过 callback ref 接收具体 Target，并把应用提供的 Runtime Factory 绑定到
`pending`、`ready`、`failed` 状态。Kernel、Session 与 History Hooks 只用
`useSyncExternalStore` 投影现有稳定值，所有写入仍通过原有 Command、Session 与 Kernel seam。

## 生命周期原则

- Target 或 Factory identity 改变会建立新的 Runtime Mount Generation；
- 旧 generation 立即失去发布资格，迟到 Runtime 仍必须 dispose；
- 后继 Factory 等待旧 Factory 与异步 dispose 收口，兼容 Renderer Target Reservation；
- create/dispose Failure 保留原始 identity，并通过必填 Reporter 显式暴露；
- dispose Failure 后不继续获取资源，避免把残留 Target 当作已经释放；
- React component unmount 本身不返回可等待的 Promise，确定性由 exactly-once ownership 与严格顺序保证。

## 明确边界

当前没有 Provider、Context、selector、React Node Component、Renderer JSX、Toolbar、Panel、
Minimap、受控 Document、写入代理、Tool Registry、Serialization、Persistence 或 Vue Adapter。
这些能力不能从“React package 已存在”推导出来；它们分别需要真实 consumer 与独立 seam
设计。

Basic SVG Example 是当前真实 consumer。Package public-seam 与 Example Chromium 测试共同
验证 pending race、Strict Mode、mount/unmount/remount、Snapshot 更新、错误暴露和清理。
