# Repository Guidelines

## 项目结构与模块组织

仓库采用 Bun 驱动的 TypeScript monorepo 结构。根级产品代码放在 `src/`，测试放在 `tests/` 并镜像源码目录；独立工作区包放在 `packages/`。文档使用 `docs/`，静态资源使用 `assets/`。入口文件和共享工具配置保留在仓库根目录。不要提交 `dist/`、`node_modules/` 等生成目录、依赖缓存或本地 IDE 配置；新增工具时同步维护 `.gitignore`。

## 构建、测试与本地开发

使用 Bun 1.2.19 或更高版本。可复现命令如下：

- `bun install`：安装依赖并启用 Git hooks。
- `bunx agent-browser install`：安装 SVG Renderer 真实浏览器测试所需的 Chromium；Linux CI 使用 `bunx agent-browser install --with-deps`。
- `bun run dev`：监听根入口并持续构建到 `dist/`。
- `bun run docs:dev`：启动中文默认、English 可切换的 Documentation Site 本地开发服务器。
- `bun run docs:quick-start`：构建公共 facade 依赖并执行站点展示的真实 Quick Start。
- `bun run docs:build`：生产构建 VitePress Documentation Site。
- `bun run docs:check`：校验公开内容、执行 Quick Start 并生产构建站点。
- `bun run docs:preview`：本地预览已经生产构建的 Documentation Site。
- `bun run build`：构建根入口，再由 `@cflow/core` 先构建其余 workspace 依赖并构建公共 facade。
- `bun run typecheck`：先构建 workspace package-name 类型解析所需的依赖声明，再检查根 TypeScript project 和所有 `@cflow/*` workspace。
- `bun run --filter '@cflow/diagnostics' build`：构建零依赖 Diagnostics 契约、运行声明隔离检查并验证 package-name import。
- `bun run --filter '@cflow/plugin-kernel' build:dependencies`：按 Kernel、Runtime 顺序生成 Kernel Runtime Plugin 构建与类型检查所需的 workspace 声明。
- `bun run --filter '@cflow/plugin-command' build:dependencies`：生成 Command Runtime Plugin 构建与类型检查所需的 Runtime workspace 声明。
- `bun run --filter '@cflow/layout-api' build:dependencies`：生成 Layout API 构建与类型检查所需的 Kernel workspace 声明。
- `bun run --filter '@cflow/plugin-layout' build:dependencies`：生成 Layout Runtime Plugin 构建与类型检查所需的 Layout API、Kernel Plugin 与 Command Plugin workspace 声明。
- `bun run --filter '@cflow/layout-dagre' build:dependencies`：生成 Dagre Layout Provider 构建与类型检查所需的 Layout API workspace 声明。
- `bun run --filter '@cflow/layout-elk' build:dependencies`：生成 ELK Layout Provider 构建与类型检查所需的 Layout API workspace 声明。
- `bun run --filter '@cflow/plugin-session' build:dependencies`：生成 Session Runtime Plugin 构建与类型检查所需的 Kernel、Runtime 与 Kernel Plugin workspace 声明。
- `bun run --filter '@cflow/session-api' build:dependencies`：生成 Session 值契约所需的 Kernel workspace 声明。
- `bun run --filter '@cflow/interaction-api' build:dependencies`：生成 Interaction Projection 值契约所需的 Kernel 与 Session API workspace 声明。
- `bun run --filter '@cflow/renderer-api' build:dependencies`：生成 Renderer 协议所需的 Diagnostics、Kernel 与 Session API workspace 声明。
- `bun run --filter '@cflow/plugin-renderer' build:dependencies`：生成 Renderer Runtime Plugin 所需的 Renderer API、Kernel Plugin 与 Session Plugin workspace 声明。
- `bun run --filter '@cflow/plugin-interaction' build:dependencies`：生成 Interaction Runtime Plugin 所需的 Command、Kernel、Session 与 Renderer Plugin workspace 声明。
- `bun run --filter '@cflow/renderer-svg' build:dependencies`：生成 SVG Renderer Provider 生产构建所需的 Renderer API 及其传递 workspace 声明。
- `bun run --filter '@cflow/renderer-svg' build:test-dependencies`：生成 Renderer Plugin、Interaction、Basic Canvas Composition 与真实 Runtime 浏览器场景所需的全部 workspace 声明。
- `bun run --filter '@cflow/plugin-history' build:dependencies`：生成 History Runtime Plugin 构建与类型检查所需的 Command 与 Kernel Plugin workspace 声明。
- `bun run --filter '@cflow/preset-basic' build:dependencies`：生成 Basic Canvas Composition 所需的 Interaction、History 及其传递 workspace 声明。
- `bun run format`：使用 Prettier 格式化支持的文件。
- `bun run test`：运行 Bun 测试。
- `bun run test:browser`：通过仓库锁定的 `agent-browser` 在真实 Chromium 中运行 SVG Renderer 公共 seam 测试。
- `bun run check`：依次运行 lint、类型检查、格式检查、Bun 测试、真实浏览器测试、构建和 Documentation Site 检查。

提交前至少运行：

- `git status --short`：确认变更范围和未跟踪文件。
- `git diff --check`：检查尾随空格及冲突标记。

若修改工具链或新增工作区脚本，请在本文件和 `README.md` 中同步记录准确命令。

## 编码风格与命名约定

优先采用所选语言的官方格式化工具，并将配置纳入版本控制。Markdown、YAML 和 JSON 使用两个空格缩进；源码遵循对应格式化器的默认规则。目录和普通文件使用 `kebab-case`，类型或组件使用 `PascalCase`，函数与变量使用该语言的惯用命名。避免无说明的缩写，并保持模块职责单一。

## 测试指南

常规测试使用 Bun 内置测试运行器，SVG Renderer 的 DOM、坐标与原生输入验收通过 `agent-browser` 驱动真实 Chromium；尚未设置覆盖率门槛。新增行为必须配套自动化测试；修复缺陷时先加入能复现问题的回归用例。Bun 测试文件使用 `tests/foo.test.ts` 命名，浏览器场景使用 `browser-tests/foo.browser.ts` 命名以避免被根 `bun test` 误发现。测试应可重复、无外部隐式依赖，并让失败直接暴露原因。

## 提交与拉取请求

历史目前只有 `Initial commit`，尚未形成稳定约定。提交信息使用简短祈使句，可采用 `feat: add flow parser`、`fix: reject invalid node` 等 Conventional Commit 前缀；每个提交只处理一个逻辑主题。

拉取请求需说明目的、主要改动和验证命令，关联相关 issue。涉及界面变化时附截图；涉及配置时列出新增环境变量，但不得提交密钥、令牌或个人配置。
