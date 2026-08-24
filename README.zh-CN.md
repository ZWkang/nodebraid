# NodeBraid

[English](./README.md) | 简体中文

NodeBraid 是一个插件化、渲染器无关的流程画布引擎，用于构建 TypeScript
编辑器，而不必将文档状态、交互、布局和渲染绑定到某个 UI 框架或图形后端。

当前源码已经提供一条可运行的 headless Canvas Runtime、显式的 Basic Canvas
Composition，以及参考级 SVG Renderer。已实现能力包括原子图事务、Selection 与
Viewport 状态、类型化 Command、Undo/Redo、Selection、多节点拖拽、Pan、Wheel
Zoom、节点级连边、Dagre 与 ELK Layout Provider、结构化诊断和 Plugin 生命周期所有权。

NodeBraid 仍处于预发布阶段，尚未提供产品级编辑器外壳、框架适配器、持久化、协作或序列化
schema。源码 package 使用 `@nodebraid/*` 命名空间，但尚未发布到 npm。

## 文档

中文优先的 Documentation Site 会明确区分当前已实现行为、目标架构和路线图能力：

- [中文文档站](https://zwkang.github.io/nodebraid/)
- [当前状态](https://zwkang.github.io/nodebraid/status)
- [English Documentation](https://zwkang.github.io/nodebraid/en/)
- [Quick Start](https://zwkang.github.io/nodebraid/guide/quick-start)
- [能力地图](https://zwkang.github.io/nodebraid/capabilities/)
- [模块索引](https://zwkang.github.io/nodebraid/modules/)
- [架构设计](./ARCHITECTURE.md)

## 从源码快速开始

NodeBraid 要求 Node.js 22.13.0 或更高版本，以及 Bun 1.2.19 或更高版本。

```bash
git clone https://github.com/ZWkang/nodebraid.git
cd nodebraid
bun install
bun run docs:quick-start
```

该命令会构建公共 `@nodebraid/core` facade 及其 workspace 依赖，然后运行真实的
Plugin Host 和 Kernel Transaction。成功输出如下：

```text
revision=1 nodes=1
```

完整示例与文档站共用
[`website/examples/quick-start.ts`](./website/examples/quick-start.ts)。首次 npm
发布前请继续使用源码 checkout 流程。

## 技术栈

- Bun：package 管理、开发、构建、测试和 workspace 脚本。
- tsgo：TypeScript 类型检查。
- oxlint：代码检查。
- Prettier：格式化。
- agent-browser：真实 Chromium Renderer seam 测试。

## 目录结构

```text
.
├── packages/
│   ├── core/           # @nodebraid/core 公共 facade
│   ├── diagnostics/    # @nodebraid/diagnostics 错误与 Diagnostic Event
│   ├── interaction-api/ # @nodebraid/interaction-api 瞬态 Projection 值
│   ├── kernel/         # @nodebraid/kernel 图状态与 Transaction
│   ├── layout-api/     # @nodebraid/layout-api 后端无关契约
│   ├── layout-dagre/   # @nodebraid/layout-dagre 官方 Provider
│   ├── layout-elk/     # @nodebraid/layout-elk 官方 Provider
│   ├── plugin-command/ # @nodebraid/plugin-command Runtime Service 适配器
│   ├── plugin-history/ # @nodebraid/plugin-history History Runtime Plugin
│   ├── plugin-interaction/ # @nodebraid/plugin-interaction Interaction Runtime
│   ├── plugin-kernel/  # @nodebraid/plugin-kernel Runtime Service 适配器
│   ├── plugin-layout/  # @nodebraid/plugin-layout Runtime Command 集成
│   ├── plugin-renderer/ # @nodebraid/plugin-renderer Renderer Runtime 适配器
│   ├── plugin-session/ # @nodebraid/plugin-session Runtime Service 适配器
│   ├── preset-basic/   # @nodebraid/preset-basic Basic Canvas Composition
│   ├── renderer-api/   # @nodebraid/renderer-api 后端无关契约
│   ├── renderer-svg/   # @nodebraid/renderer-svg 官方 SVG Provider
│   ├── session-api/    # @nodebraid/session-api 不可变 Session 值
│   └── runtime-cordis/ # @nodebraid/runtime-cordis 实现 package
├── src/               # 根 TypeScript 源码
├── tests/             # 根自动化测试
├── bun.lock           # Bun 锁文件
├── tsconfig.base.json # 共享 TypeScript 编译选项
└── tsconfig.json      # 根 TypeScript project
```

## Plugin Host packages

大多数使用者应从 `@nodebraid/core` 导入 NodeBraid 自有的 Plugin Host API：

```ts
import { createPluginHost, definePlugin, defineService } from '@nodebraid/core';
```

`@nodebraid/core` 是公共 facade，具体实现委托给 `@nodebraid/runtime-cordis`。
高级使用者可以直接导入这个窄 package，但 Cordis 类型仍然只存在于其内部。

首版实现了空 Plugin Host 基座、Runtime Service 依赖、生命周期所有权和 Child
Installation 组合。它不会隐式安装 Kernel、Session、Renderer 或其他 Canvas
能力。“Everything is Plugin”适用于这些 Canvas 能力；最小 Host 基座是拥有首次安装和最终释放的边界。

## Diagnostics package

`@nodebraid/diagnostics` 提供共享 `NodeBraidError`、稳定的 `domain + code`
身份、不可变 Diagnostic Event 契约、安全错误描述，以及各 package 自有的事件目录。它不依赖 Runtime
或日志实现。

每个 Plugin Host 都可以接收独立的同步 Diagnostic Sink 和 Fault Reporter。Host、
Installation、Activation、Plugin scope 与单调递增序号让事件无需解析 message
即可直接检索。Console、文件、Sentry、OpenTelemetry、过滤、批处理和持久化仍由应用 Adapter
负责。

## Kernel package

`@nodebraid/kernel` 实现了与 Renderer 无关的图核心：Node 与 Edge 状态、同步原子
Transaction、绑定 revision 的 Canvas View、Canvas Query，以及可逆的 before/after
Change Set。

大多数使用者也可以从 `@nodebraid/core` 导入同一接口。纯 Kernel 不依赖 Plugin
Host、Cordis、RxJS、Renderer、DOM 对象或框架适配器。

## Kernel Runtime Plugin

`@nodebraid/plugin-kernel` 通过窄 `KernelService` 为每个 Plugin Activation
提供一份全新的 Kernel。使用者可以读取绑定 revision 的 View、执行同步 Transaction，并按
revision 顺序观察成功且产生净变化的 Canvas Commit。Observer 失败不会回滚 Kernel
状态或阻断后续 Observer；重入 Transaction 会排队，直到当前 revision 已交付给所有 Observer。

该适配器直接依赖 `@nodebraid/kernel` 与 `@nodebraid/runtime-cordis` 中 NodeBraid
自有的 seam，不会引入推测性的 plugin-api package。具体 Renderer Provider、持久化、初始
Document 导入和异步 Transaction 仍属于未来 Runtime 工作。

## Session Runtime Plugin

`@nodebraid/plugin-session` 为每个 Plugin Activation 提供一份全新的
`SessionService`。它在 Document 之外持有不可变 Selection 和 Viewport Snapshot，
并依赖窄 Kernel Service，使外部 Selection 更新只能接受当前 Canvas View 中存在的实体。

等价更新会保留 Snapshot 身份且不触发通知。Kernel Commit 通过 Session channel
移除失效 Selection 成员，不会产生另一个 Kernel Change Set 或 History Entry。重入
Session mutation 使用广度优先 FIFO 交付，使每个订阅者在一轮通知中看到一致的 Snapshot。

## Renderer packages

`@nodebraid/renderer-api` 定义后端无关的 `CanvasRenderer` 协议：reset-or-commit
Document 更新、独立 Session Snapshot、瞬态 Interaction Projection、标准化
Pointer/Wheel/Keyboard/Focus 输入、语义化 Hit Result、输入控制和结构化 Renderer
错误。它不包含 DOM、Canvas Context、原生 Event、Konva、Pixi、Cordis 或框架类型。

`@nodebraid/plugin-renderer` 将一个类型化 Renderer Factory 绑定到 Kernel 和
Session Service。每个 Activation 拥有一个与 target 绑定的 Renderer Instance，先交付
Document reset 再交付 Session 状态，保持 Selection 可解析顺序，并通过窄
`RendererService` 暴露输入、Hit Test、Pointer Capture、Focus 和唯一的 Interaction
Projection Binding。具体 Renderer Provider 是独立、显式的 package；NodeBraid
不选择默认 Provider 或 registry。

`@nodebraid/renderer-svg` 是首个参考级官方 Provider。它绑定已有
`SVGSVGElement`，投影通用矩形 Node 和直线 Edge，并提供稳定的 SVG class 与 data
attribute，而不解释产品 Node type 或 data。它仍是显式的同级 Provider，不会作为默认实现从
`@nodebraid/core` 重导出。

## Interaction packages

`@nodebraid/interaction-api` 持有不可变、后端无关的 Node Drag、Viewport Pan 和
Connection Preview 值。`@nodebraid/plugin-interaction` 消费标准化 Renderer
Input 与 Hit Result，实现 Selection、多节点拖拽、Canvas/middle/Space Pan、锚定
Wheel Zoom，以及可选的纯鼠标节点级连边，并且不暴露状态 Service。

稳定 Selection 与 Viewport 变化通过 Session；最终 Node 移动和 Edge 创建使用类型化
Command 与一次 Kernel Transaction。应用通过同步 Connection materializer 提供完整
Edge ID/type/data。Pointer move Preview 保留在唯一 Renderer Projection
Binding 中。取消、过期证据、Capture 丢失、依赖恢复和清理都显式且可观测。Core 会重导出两个后端无关
Interaction package，但仍不会重导出具体 SVG Provider。

## Command Runtime Plugin

`@nodebraid/plugin-command` 为每个 Plugin Activation 提供一份空
`CommandService`。Feature Plugin 注册强类型 Command token 并拥有返回的
registration；调用方通过支持同步或异步 handler 的 Promise seam 执行同一 token。

Registration 或 Service 释放时会先从 lookup 中移除 Command，再中止并等待执行中的
handler。Command package 只依赖 NodeBraid 自有 Plugin Host seam。Feature Plugin
通过自己的静态 Service Binding 获取 Kernel、Session 或外部能力。

## History Runtime Plugin

`@nodebraid/plugin-history` 将 Baseline 之后每次非 replay Canvas Commit 记录为一个
History Entry，并暴露强类型 Undo/Redo Command。Replay 通过 Kernel Service
Transaction 应用已存储 Change Set，产生新的递增 revision，并返回对应 Canvas Commit。

`HistoryService` 只暴露稳定的 `canUndo` / `canRedo` Snapshot 和订阅 seam。
Replay 为 single-flight；Observer 重入时 Commit 仍按 revision 顺序交付；公共 Snapshot
要等到 History 追上 Kernel 后才发布。失去 Kernel Service 或 Command Service 会结束当前
History Activation；重新激活时从新的空 Baseline 开始。

## Basic Canvas Composition

`@nodebraid/preset-basic` 暴露
`createBasicCanvasPlugin(rendererFactory, options?)`。它是后端无关的普通
Plugin，通过 Child Installation 拥有 Kernel、Command、Session、Renderer、
Interaction 与 History。Composition 会等待每个 child 激活，并按依赖安全的逆序释放。

应用仍负责创建 Plugin Host、配置 Diagnostics、选择具体 Renderer Factory，并将
Layout 或领域能力作为同级 Plugin 安装。Core 会重导出 Composition factory，但不会重导出或选择
`@nodebraid/renderer-svg` 或其他具体 Provider。

## Layout packages

`@nodebraid/layout-api` 定义不可变 Layout Input、异步 Layout Engine、显式
capability 和严格 Layout Proposal 校验。`@nodebraid/plugin-layout` 将一个 Engine
绑定到一个类型化 Command，并通过一次同步 Kernel Transaction 提交有效 Proposal，同时提供取消和过期
revision 保护。

`@nodebraid/layout-dagre` 与 `@nodebraid/layout-elk` 是显式可选
Provider，不会由 `@nodebraid/core` 重导出。Dagre 提供确定性的 full layout；ELK
提供 full layout，并通过 Stress algorithm 支持 incremental 与 Fixed Node 请求。

## 常用命令

安装依赖：

```bash
bun install
```

安装 SVG Renderer 浏览器测试所需 Chromium：

```bash
bunx agent-browser install
```

启动本地 watch build：

```bash
bun run dev
```

启动本地文档站：

```bash
bun run docs:dev
```

执行文档 Quick Start 并构建生产文档站：

```bash
bun run docs:check
```

预览已构建文档站：

```bash
bun run docs:preview
```

构建根入口和全部 `@nodebraid/*` workspace package：

```bash
bun run build
```

运行仓库全部检查：

```bash
bun run check
```

运行单项检查：

```bash
bun run lint
bun run typecheck
bun run format:check
bun run test
bun run test:browser
```

Workspace package 类型检查会先构建 package-name 解析所需的依赖声明，因此相同命令可以在没有
预存 `dist` 的干净 checkout 中运行。

只构建并验证独立 Diagnostics package：

```bash
bun run --filter '@nodebraid/diagnostics' build
```

只构建 `@nodebraid/plugin-kernel` 所需声明：

```bash
bun run --filter '@nodebraid/plugin-kernel' build:dependencies
```

只构建 `@nodebraid/plugin-command` 所需声明：

```bash
bun run --filter '@nodebraid/plugin-command' build:dependencies
```

构建 Layout package 所需声明：

```bash
bun run --filter '@nodebraid/layout-api' build:dependencies
bun run --filter '@nodebraid/plugin-layout' build:dependencies
bun run --filter '@nodebraid/layout-dagre' build:dependencies
bun run --filter '@nodebraid/layout-elk' build:dependencies
```

构建 `@nodebraid/plugin-session` 所需声明：

```bash
bun run --filter '@nodebraid/plugin-session' build:dependencies
```

构建 `@nodebraid/plugin-history` 所需声明：

```bash
bun run --filter '@nodebraid/plugin-history' build:dependencies
```

构建 SVG Renderer Provider 所需依赖并运行真实浏览器 seam 测试：

```bash
bun run --filter '@nodebraid/renderer-svg' build:dependencies
bun run --filter '@nodebraid/renderer-svg' build:test-dependencies
bun run --filter '@nodebraid/renderer-svg' test:browser
```

独立构建 Interaction 值与 Runtime package：

```bash
bun run --filter '@nodebraid/interaction-api' build:dependencies
bun run --filter '@nodebraid/plugin-interaction' build:dependencies
```

构建 Basic Canvas Composition 所需依赖：

```bash
bun run --filter '@nodebraid/preset-basic' build:dependencies
```

格式化支持的文件：

```bash
bun run format
```

## 创建 package

在 `packages/` 下创建 package 目录：

```text
packages/
└── my-package/
    ├── package.json
    └── src/
        └── index.ts
```

每个 workspace package 可以定义自己的构建与发布行为，同时共享根工具链。

从仓库根目录运行单个 workspace package 的脚本：

```bash
bun run --filter '@nodebraid/core' build
bun run --filter '@nodebraid/core' test
```

## 许可证

[MIT](./LICENSE)
