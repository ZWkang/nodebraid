---
title: Layout
description: 将异步布局计算与同步 Document 提交分离，并显式选择 Dagre 或 ELK Provider。
---

# Layout

Layout 能力族把“计算候选位置”和“修改权威 Document”拆成两步。`LayoutEngine` 只接收不可变 `LayoutInput` 并异步返回 `LayoutProposal`；Runtime Command 验证 Proposal 仍来自当前 revision 后，才用一个同步 Transaction 提交全部 Node 位置。

```text
Canvas View
    │ createLayoutInput
    ▼
Layout Input ──▶ Layout Engine ──▶ Layout Proposal
                                      │ validate + stale check
                                      ▼
                              one Kernel Transaction
```

这条边界让取消、并发结果、Provider failure 与 History 行为都可见：Layout 不直接持有 Kernel，也不会为每个 Node 产生一次独立提交。

## 你需要哪些 package

| 角色                      | Package                                              | 何时需要                                                                 |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Provider-neutral contract | [`@nodebraid/layout-api`](/modules/layout-api)       | 定义 Engine、Input、Proposal、capability，或在 Runtime 外只计算 Proposal |
| Runtime integration       | [`@nodebraid/plugin-layout`](/modules/plugin-layout) | 把一个 Engine 静态绑定到强类型 Command，并将 Proposal 提交到 Kernel      |
| Dagre Provider            | [`@nodebraid/layout-dagre`](/modules/layout-dagre)   | 需要确定性的全量分层布局，不需要 incremental 或 Fixed Node               |
| ELK Provider              | [`@nodebraid/layout-elk`](/modules/layout-elk)       | 需要 ELK layered，或使用 Stress 获得 incremental 与 Fixed Node           |

`@nodebraid/core` 重导出 provider-neutral API 与 Runtime integration，但不依赖或重导出 Dagre、ELK。应用必须显式选择 concrete Provider。

## Provider 选择

| 能力               | Dagre                                     | ELK                                                     |
| ------------------ | ----------------------------------------- | ------------------------------------------------------- |
| Full layout        | 支持                                      | 支持                                                    |
| Incremental layout | 不支持                                    | 支持，要求 `stress` algorithm                           |
| Fixed Node         | 不支持                                    | 支持，要求 `stress` algorithm                           |
| Self-loop input    | 支持                                      | 支持                                                    |
| 配置重点           | direction、node/edge/rank spacing、margin | algorithm、direction、node/layer spacing、padding、seed |

NodeBraid 不指定默认 Provider，也没有动态 Layout Registry。Provider ID 是诊断信息；真正的 Runtime 身份是应用为该 Engine 创建并持有的 Command token。

## 输入边界

首版 Layout 处理整张 Canvas，并要求：

- 每个 Node 都有明确 Size；
- Node 没有 `parentId`；
- Edge Endpoint 不带 `portId`；
- Fixed Node ID 存在且不重复；
- `incremental` 仍计算整张图，当前位置只提供稳定性约束；
- Fixed Node 是必须保持绝对 World Position 的硬约束。

不满足这些条件时会在进入 Provider 前失败，不会猜测尺寸、忽略 Port 或只布局一部分 Node。

## 提交与并发

有效 Proposal 必须带回捕获的 source revision，并为每个输入 Node 提供且只提供一个有限坐标。Runtime 在提交前再次读取当前 Kernel revision：如果 Document 已变化，整个 Proposal 以 `STALE_PROPOSAL` 失败，而不是自动 rebase。

一次有净变化的 Layout Command 最多产生一个 Canvas Commit，因此自然对应一个 Change Set 和一个 History Entry；全部位置不变时可返回 `null` Commit。

## 当前不包含

- subset layout；
- Edge Routing 与 waypoint；
- preview、animation 或交互拖拽策略；
- Worker execution、cache 或 persistence；
- 动态 Provider Registry 或默认 Provider；
- 对 nested Node 和 Port Geometry 的静默降级。

## 验证依据

当前实现通过 provider-neutral contract 测试、Proposal/Request validation 测试、Runtime stale/cancellation/commit 测试，以及 Dagre 与 ELK 的真实端到端组合测试验证。两种 Provider 均通过同一 `LayoutEngine` seam 进入真实 Plugin Host、Kernel 与 Command Service。
