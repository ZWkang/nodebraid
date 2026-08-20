---
title: '@cflow/renderer-api'
description: CFlow-owned、backend-neutral 的 Renderer Provider contract。
---

# `@cflow/renderer-api`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

不同渲染后端拥有不同 Target、场景对象和原生事件。`@cflow/renderer-api` 定义一条最小 CFlow seam：Provider 接收 Document 与 Session 的 Canvas 语义投影，输出标准化 Renderer Input 与 Hit Result，而不会把 DOM、Canvas Context、Konva/Pixi 对象或第二条状态写入路径扩散给调用方。

该 package 是 contract，不是渲染实现。

## 何时使用

- 你要实现 SVG、Canvas2D、WebGL、Headless 或其他 Renderer Provider；
- 你需要声明 Provider-specific、强类型的 Factory config 与 Target；
- 你要实现连续 revision 更新、Session projection、输入标准化和 Hit Test；
- 你要与 `@cflow/plugin-renderer` 组合，而不让 Provider 依赖 Plugin Host。

普通应用只在选择或实现 Provider 时直接接触该 seam。仅使用这个 package 不会创建可见画布。

## 提供的能力

- `CanvasRenderer`：Document/Session/Interaction 投影、Input subscription、Hit Test、Pointer Capture、Focus 与 terminal dispose；
- `RendererFactory<Config>`：用 Provider-specific immutable config 创建一份 Renderer Instance；
- `RendererDocumentUpdate`：`reset` 完整建立 Baseline，`commit` 交付一个完整 Canvas Commit；
- `RendererInput`：Pointer、Wheel、Keyboard 与 Focus discriminated union；
- `ScreenPoint`、`InputModifiers`、`PointerButton` 与 `PointerType`；
- `HitResult`：Canvas、Node、Edge 或 Port 语义目标与 World Point；
- `RendererError`：Provider contract failure 的稳定错误身份。

Document update 调用返回时，Renderer 的逻辑状态必须已经接受更新，使后续 Hit Test 能观察新状态；实际像素绘制仍可由 Provider 批处理。

## 依赖与组合

该 package 依赖 `@cflow/kernel` 的 Canvas View/Commit 与实体 identity、`@cflow/session-api` 的共享 Session Snapshot、`@cflow/interaction-api` 的 Projection 值，以及 `@cflow/diagnostics` 的结构化错误。它不依赖 Runtime、Plugin Host、具体后端、框架或 `@cflow/core`。

Provider package 应只依赖本 contract，自行导出具名 Factory 与具体 Config。当前 [`@cflow/renderer-svg`](/modules/renderer-svg) 就是这条边界的官方实现；应用可再通过 [`@cflow/plugin-renderer`](/modules/plugin-renderer) 把 Factory 接入 Runtime。

## 公共入口

```ts
import {
  RendererError,
  type CanvasRenderer,
  type FocusInput,
  type HitResult,
  type InputModifiers,
  type KeyboardInput,
  type PointerButton,
  type PointerInput,
  type PointerType,
  type RendererDocumentUpdate,
  type RendererErrorCode,
  type RendererFactory,
  type RendererInput,
  type RendererInputListener,
  type ScreenPoint,
  type WheelInput,
} from '@cflow/renderer-api';
```

这些 contract 也由 `@cflow/core` 重导出；concrete Provider 不会被 core 隐式带入。

## 生命周期与错误语义

一份 Renderer Instance 在 Factory 创建时绑定一个固定 Target。Target 放在 Provider Config 中，公共 interface 不提供 universal mount。切换 Target 或 Provider，需要释放旧实例并创建新实例。

Provider 必须把 `reset` 视为完整 Baseline；后续 `commit.before` revision 必须与已接受 Baseline 连续，并在完整验证后一次性接受。重复、stale、跳号或内部证据不一致的 Commit 不能被忽略或部分应用。

Renderer Input 订阅按标准化后的真实顺序同步发布。listener 集合在每条 Input 开始时固定，重入 Input 采用 FIFO 广度优先顺序，取消幂等。`dispose()` 是 terminal、异步且幂等的；开始释放后，更新、命中和新增订阅应以 `RENDERER_DISPOSED` 显式失败。

| Code                             | 适用失败                                      |
| -------------------------------- | --------------------------------------------- |
| `INVALID_DOCUMENT_UPDATE`        | reset/commit 结构或 revision evidence 无效    |
| `DOCUMENT_OUT_OF_SYNC`           | Commit 与当前 Renderer Baseline 不连续        |
| `INVALID_SESSION_SNAPSHOT`       | Session 值无效或无法由当前 Document 解析      |
| `INVALID_SCREEN_POINT`           | Hit Test 输入坐标无效                         |
| `INVALID_INPUT_SUBSCRIBER`       | Input listener 无效                           |
| `INVALID_POINTER`                | Pointer capture/release 请求无效              |
| `INVALID_INTERACTION_PROJECTION` | Interaction Projection 结构无效               |
| `INTERACTION_OUT_OF_SYNC`        | Projection 的 Document/Viewport evidence 失效 |
| `RENDERER_DISPOSED`              | Renderer Instance 已开始终态释放              |

这些约束由 concrete Provider 实现。结构校验必须发生在修改 Baseline 或逻辑状态之前；Provider Factory、后端投影和 dispose 的原始失败保留身份。

## 限制与非目标

- 当前只交付一个参考级 SVG Provider，不包含其他后端或默认选择策略；
- 不提供默认 Provider、Factory Registry、通用 Config schema 或配置合并；
- 不定义 DOM、SVG、Canvas、WebGL 或 framework 类型；
- 不暴露 Document/Session 写权、Command execution 或 native event；Interaction update 只接受瞬态语义 Projection；
- 不包含 text input、IME、clipboard、pressure、tilt、coalesced event 或时间戳；
- 不定义 renderer scene、z-order、Handle、动画和业务 Node 外观。

## 验证依据

package 类型测试锁定 Factory config、Document/Session update 类型、无 universal mount 与无后端类型泄漏；运行测试锁定标准化 Input 值和 `RendererError` 的 domain/code/details。accepted Renderer ADR 进一步定义连续 Commit、Target ownership、输入顺序和 disposal contract；SVG Provider 的真实 Chromium 测试证明该 contract 已被实际浏览器后端完整消费。
