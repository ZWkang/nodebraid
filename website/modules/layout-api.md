---
title: '@nodebraid/layout-api'
description: Provider-neutral Layout Input、Engine、Proposal、capability 与验证契约。
---

# `@nodebraid/layout-api`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

布局库通常拥有不同的配置、坐标和输出模型。`@nodebraid/layout-api` 定义 NodeBraid 自己的最小语义 seam，让 Dagre、ELK 或第三方 Engine 都围绕同一份不可变 Canvas 投影计算候选 Node 位置，而不获得 Document 写权。

## 何时使用

- 你要实现一个新的 Layout Provider；
- 你要在 Runtime 之外计算尚未提交的 Layout Proposal；
- 你要验证 Provider capability 或不可信 Proposal；
- 你需要共享 full、incremental 与 Fixed Node 请求语义。

一般应用若只想在 Canvas Runtime 中执行布局，会同时使用 `@nodebraid/plugin-layout` 和一个 concrete Provider。

## 提供的能力

- `LayoutInput`：revision、mode、完整 Node/Edge 投影和 Fixed Node 标记；
- `LayoutEngine<Config>`：稳定 ID、不可变 capability 与可取消的异步 `compute()`；
- `LayoutProposal`：source revision 与完整 Node positions；
- `defineLayoutEngine()`：规范化 capability、取消检查与 Proposal validation；
- `createLayoutInput()`：从 committed Canvas View 创建 NodeBraid-owned immutable input；
- `assertLayoutCapabilities()`：拒绝 Provider 未声明支持的请求；
- `validateLayoutProposal()`：验证 revision、完整 Node coverage、有限坐标与 Fixed Node；
- `LayoutError`：稳定 `layout + code` 错误身份。

## 依赖与组合

该 package 依赖 `@nodebraid/kernel` 的 identity、geometry 与 Canvas View，以及 `@nodebraid/diagnostics` 的结构化错误契约。它不依赖 Plugin Host、Command Service、具体 Provider 或 `@nodebraid/core`。

Runtime 提交通常由 [`@nodebraid/plugin-layout`](/modules/plugin-layout) 完成；[`@nodebraid/layout-dagre`](/modules/layout-dagre) 和 [`@nodebraid/layout-elk`](/modules/layout-elk) 都实现这套 Engine seam。

## 公共入口

```ts
import {
  assertLayoutCapabilities,
  createLayoutInput,
  defineLayoutEngine,
  LayoutError,
  validateLayoutProposal,
  type LayoutEngine,
  type LayoutInput,
  type LayoutProposal,
} from '@nodebraid/layout-api';
```

这些入口也由 `@nodebraid/core` 重导出。

## 验证与错误语义

共享结构错误只使用五个 code：

| Code                  | 含义                                                         |
| --------------------- | ------------------------------------------------------------ |
| `INVALID_REQUEST`     | mode 或 Fixed Node 请求无效                                  |
| `INVALID_INPUT`       | Canvas 投影缺少 Size，或包含不支持的 nesting/Port            |
| `UNSUPPORTED_FEATURE` | Provider capability 不覆盖请求                               |
| `INVALID_PROPOSAL`    | Proposal revision、Node coverage、坐标或 Fixed Node 结果无效 |
| `STALE_PROPOSAL`      | Runtime 提交前发现 Kernel revision 已变化                    |

`STALE_PROPOSAL` 由 Runtime integration 使用，但错误身份归 Layout contract 所有。Provider-specific config error 与底层 failure 保留自己的值，不被强行包装成共享错误。

## 限制与非目标

- Engine 不写 Kernel；
- Proposal 不携带 Provider ID、mode、配置、Edge Routing 或任意 entity patch；
- 首版只支持 whole-canvas input；
- 不支持 nested Node、Port Endpoint 或缺少 Size 的 Node；
- 不提供 Registry、默认 Provider、Worker、cache 或 persistence。

## 验证依据

package tests 覆盖 request projection、capability、proposal validation、错误身份、取消、immutable ownership 与 declaration boundary；Runtime 和两个官方 Provider 进一步通过相同 seam 验证其可组合性。
