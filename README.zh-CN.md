# NodeBraid

[English](./README.md) | 简体中文

**面向 TypeScript 的插件化、渲染器无关的流程画布引擎。**

将文档状态、交互、布局和渲染独立组合，用于构建节点编辑器。按需安装画布能力，显式选择
Renderer Provider，并由应用掌握节点类型、业务数据和产品 UI。

[文档站](https://zwkang.github.io/nodebraid/) ·
[快速开始](#快速开始) ·
[能力地图](https://zwkang.github.io/nodebraid/capabilities/) ·
[架构设计](./ARCHITECTURE.md)

> **预发布阶段：** `@nodebraid/*` 尚未发布到 npm，请从源码运行。
> 当前提供画布引擎和开发者参考应用，尚不包含产品级编辑器外壳、自动／云端持久化或协作能力。

## 已有能力

| 能力       | 当前实现                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 图状态     | Node 与 Edge、原子 Transaction、绑定 revision 的查询，以及可逆 Change Set。                         |
| 画布交互   | 选择、框选、多节点拖拽、平移、滚轮缩放，以及端口级或节点级连线。                                    |
| 编辑       | 节点创建与单次放置、数据编辑、删除选中项、生成副本、剪贴板复制粘贴，以及撤销／重做。                |
| 渲染       | SVG Renderer Provider，支持自定义 SVG 节点内容和标准化输入。                                        |
| 布局       | Dagre 全量布局；ELK 全量、增量布局与固定节点约束。                                                  |
| 文档文件   | 版本化完整图序列化，由应用提供数据 codec；示例支持手动导出／导入。                                  |
| React 集成 | 面向 React 19 客户端渲染的 Runtime 挂载／释放，以及稳定的 Kernel、Session、History Snapshot Hooks。 |
| 扩展       | 强类型 Command 与 Runtime Service、Plugin 生命周期管理，以及结构化诊断。                            |

布局只排列 Node 并保留 Port 连接，端口几何不参与布局算法。自定义 SVG 内容仍使用矩形命中边界。
React Snapshot Hooks 不支持 SSR，其他 UI 框架的适配器尚未提供。完整边界见
[当前状态](https://zwkang.github.io/nodebraid/status)。

## 快速开始

需要 **Node.js ≥ 22.13.0** 和 **Bun ≥ 1.2.19**。以下命令均在仓库根目录执行。

```bash
git clone https://github.com/ZWkang/nodebraid.git
cd nodebraid
bun install
bun run example:dev
```

打开开发服务器输出的地址，进入 `/basic-svg`。Examples Application 会自动构建所需 workspace
依赖，可体验节点创建与编辑、选择、拖拽、连线、复制粘贴、撤销／重做、手动 Dagre 布局和文档导出／导入。

示例在本地运行，[交互示例指南](https://zwkang.github.io/nodebraid/guide/interactive-example)
提供操作说明。示例 UI 由应用实现，不属于引擎内置的产品编辑器。

### 运行无界面示例

无需打开浏览器，即可验证 Plugin Host 与一次 Kernel Transaction：

```bash
bun run docs:quick-start
```

该命令构建 `@nodebraid/core` 及其依赖，然后运行
[与文档站共用的示例](./website/examples/quick-start.ts)。预期输出：

```text
revision=1 nodes=1
```

## 模块如何组合

- **Kernel 拥有 Document。** Node 与 Edge 通过原子 Transaction 更新；Session 独立管理
  Selection 和 Viewport，History 记录文档变化。
- **Plugin 组成 Canvas Runtime。** `createPluginHost()` 创建空 Host；
  `createBasicCanvasPlugin(rendererFactory, options?)` 显式组合 Kernel、Port、Command、
  Node Editing、Session、Renderer、Interaction 和 History。
- **应用选择 Provider，并拥有产品行为。** 显式选择 Renderer Factory，按需安装 Layout、
  Duplicate Selection 或 Clipboard Plugin，并提供节点数据、codec、剪贴板 transport 和 UI。

后端无关的公共 API 从 `@nodebraid/core` 导入：

```ts
import { createPluginHost, createBasicCanvasPlugin } from '@nodebraid/core';
```

`@nodebraid/renderer-svg`、`@nodebraid/layout-dagre`、`@nodebraid/layout-elk` 等具体
Provider，以及 `@nodebraid/adapter-react`，均从各自 package 导入。Core 不选择或重导出默认
Renderer、Layout Provider。

| 模块入口                                                                                                                                                                                  | 用途                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [Core](./packages/core/README.md) · [Basic Composition](./packages/preset-basic/README.md)                                                                                                | 公共 API 与可直接组合的基础画布能力。    |
| [Kernel](./packages/kernel/README.md) · [Document](./packages/document/README.md)                                                                                                         | 图不变量、Transaction 与完整文档文件。   |
| [Plugin Host](./packages/runtime-cordis/README.md) · [Diagnostics](./packages/diagnostics/README.md)                                                                                      | Service 依赖、生命周期和可观察的错误。   |
| [Command](./packages/plugin-command/README.md) · [Session](./packages/plugin-session/README.md) · [History](./packages/plugin-history/README.md)                                          | 动作、Selection／Viewport 和撤销／重做。 |
| [Interaction](./packages/plugin-interaction/README.md) · [Port](./packages/plugin-port/README.md)                                                                                         | 手势、快捷键和节点连接定义。             |
| [Node Editing](./packages/plugin-node-editing/README.md) · [Duplicate Selection](./packages/plugin-duplicate-selection/README.md) · [Clipboard](./packages/plugin-clipboard/README.md)    | 编辑行为与应用需要提供的输入。           |
| [Renderer API](./packages/renderer-api/README.md) · [SVG Renderer](./packages/renderer-svg/README.md)                                                                                     | 后端无关的渲染契约与 SVG 实现。          |
| [Layout API](./packages/layout-api/README.md) · [Layout Plugin](./packages/plugin-layout/README.md) · [Dagre](./packages/layout-dagre/README.md) · [ELK](./packages/layout-elk/README.md) | 布局计算与结果的原子提交。               |
| [React Adapter](./packages/adapter-react/README.md) · [示例源码](./examples/app/src/)                                                                                                     | React 生命周期集成与完整参考应用。       |

[模块索引](https://zwkang.github.io/nodebraid/modules/)提供全部 package 的说明，包含独立值契约与 Runtime 适配器。

## 本地开发

仓库使用 Bun、TypeScript／tsgo、oxlint 和 Prettier。真实浏览器测试通过锁定版本的
`agent-browser` 驱动 Chromium。Examples Application 使用 React、TanStack Router、
shadcn 与 Base UI、Tailwind CSS 和 Vite。

执行浏览器检查或仓库全量检查前，先安装 Chromium：

```bash
bunx agent-browser install
```

Linux CI 使用 `bunx agent-browser install --with-deps`。

| 命令                                 | 用途                                                          |
| ------------------------------------ | ------------------------------------------------------------- |
| `bun run example:dev`                | 构建依赖并启动交互示例。                                      |
| `bun run example:check`              | 构建示例、检查类型并执行浏览器验收。                          |
| `bun run dev`                        | 监听根入口构建，不启动示例应用。                              |
| `bun run build`                      | 构建根入口与公共 workspace package。                          |
| `bun run check:affected --plan`      | 查看当前变更对应的检查范围。                                  |
| `bun run check:affected`             | 执行受影响范围的开发检查，包含工作区变更。                    |
| `bun run check:affected --base main` | 根据与 `main` 的 merge-base 及工作区变更选择检查。            |
| `bun run check`                      | 执行完整 lint、格式、构建、类型、单元测试、浏览器与文档检查。 |
| `bun run docs:dev`                   | 启动本地文档站。                                              |
| `bun run docs:check`                 | 校验文档、运行 Quick Start 并构建站点。                       |
| `bun run docs:preview`               | 预览已构建的文档站。                                          |
| `bun run format`                     | 格式化支持的文件。                                            |

从根目录执行单个 package 的普通脚本，会自动准备所需 workspace 依赖。
`:self` 脚本仅供已完成依赖构建的内部调度使用。

```bash
bun run --filter '@nodebraid/core' build
bun run --filter '@nodebraid/core' test
```

受影响范围检查用于开发迭代，不能替代正式交付的全量验证。单项检查、各包命令和贡献要求见
[AGENTS.md](./AGENTS.md)。

### 目录导航

```text
packages/       公共 @nodebraid/* packages
examples/app/   私有 React Examples Application
website/        双语文档站与共用 Quick Start
src/            根 TypeScript 入口
tests/          跨包与工具测试
scripts/        构建、验证与本地工作流工具
docs/           架构决策与贡献流程
```

### 贡献与 Agent 工作流

从 [AGENTS.md](./AGENTS.md)、[领域词汇表](./CONTEXT.md)和相关
[架构决策](./docs/adr/)开始。每个新需求使用一个 GitHub spec Issue 和一个面向 `main` 的
PR，实施 ticket 保留在本地 run 中，具体遵循 [Issue tracker 约定](./docs/agents/issue-tracker.md)。

本地 Codex 工作流使用 ChatGPT 登录开展调查、实现、独立 Standards／Spec 审查和 PR 反馈修复；
GitHub 保存权威 Issue、PR 与 CI。设置和命令见 [Agent 工作流](./docs/agents/agentic-workflows.md)，
验证遵循[能力验证地图](./.agents/skills/control-nodebraid/references/capabilities.md)、
[PR 证据流程](./docs/agents/pr-evidence.md)与 [PR 风险规则](./.agents/skills/pr-risk/SKILL.md)。

[Checks workflow](./.github/workflows/test.yml) 在推送到 `main` 或在 `main` 上手动运行时，
先执行全量检查，再部署同次构建的文档产物。GitHub Pages 的 Source 需设置为 **GitHub Actions**。

## 许可证

[MIT](./LICENSE)
