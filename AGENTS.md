# Repository Guidelines

## Agent skills

### Issue tracker

新增需求规格和活跃任务统一记录在 `ZWkang/nodebraid` 的 GitHub Issues：父 Issue 保存规格，子 Issue 保存实现任务，PR 关联对应任务。开始需求整理、拆票、实现或审查前，先读取 [Issue tracker 约定](docs/agents/issue-tracker.md)。`.scratch/` 仅保留历史资料，不再新增规格或维护活跃任务状态。

### Domain docs

本仓库使用单一领域上下文。探索代码前，按 [Domain docs 约定](docs/agents/domain.md) 读取根目录 `CONTEXT.md` 和相关 `docs/adr/`。

## AI 工作流

新任务先与用户确认 grill、spec、领域文档和公共测试 seam；确认后，Agent 自主拆分任务、审查计划、实现、验证和双轴 code review，无需逐票再次确认。需求、公开契约或架构决策变化时回到前期讨论。

Issue 调查、自主交付和 PR 反馈修复由本地 Codex 聊天自动化执行，使用现有 ChatGPT 订阅登录；GitHub 保留任务记录和工程 CI。执行协议见 `.agents/workflows/local-agent.md`，设置与验收见 `docs/agents/agentic-workflows.md`，任务路由见 `docs/agents/issue-tracker.md`。`CONTEXT.md` 是唯一领域词汇表，skill 提到 `GLOSSARY.md` 时读取它。

实现阶段应用项目级 `ponytail` 的 full 模式，先读真实调用链并优先复用，再完成最小充分改动。Standards review 同时使用 `ponytail-review`；按已确认的 spec、ADR 和公共契约判断简化，不删必要的错误处理、验证或框架 seam。

- `bun run agents:check`：检查本地工作流协议、skills 和残留的托管 API 执行入口；CI 在完整工程检查前执行。
- `bun run agents:local-check`：另检查本机 ChatGPT CLI 登录；有 API-key 环境变量时明确失败，不切换计费入口。
- `bun run agents:scan [base-sha]`：在已 fetch 的干净 main worktree 记录固定 SHA 调查范围。
- `bun run agents:run`：归一化完整 GitHub 上下文，独立准备任务、检查依赖前沿、执行真实检查、绑定发布 tree 和判断当前 head；参数见 `docs/agents/agentic-workflows.md`。
- `bun run agents:discovery init|sync <queue.json>`：显式初始化或恢复按公共 seam 保存的调查待办；无新提交也保留未检查区域。
- `bun run agents:discovery finish <queue.json> <report.json>`：只用当前 main 的成功执行报告完成一个待办。
- `bun run agents:typecheck`：检查本地工作流命令及其共享状态模块的 TypeScript 类型；包含在完整工程类型检查中。
- `bun test tests/pr-feedback.test.ts`：验证 PR 当前 head 的 CI／review 状态、反馈去重和交接校验。
- `bun test tests/defect-scan.test.ts`：验证主动调查的固定 SHA 和成功运行基线。

本地自动化检查新 main 变更、Issue 和托管 PR；复现并查重后记录 Issue，再实现已确认任务。
GitHub 写入使用已连接工具或已认证 Git client，不复制订阅登录文件或连接器凭据。

托管 issue PR 以 `[local-agent] `（兼容 `[agent] `）标题和 `feat/issue-N` 分支加入本地 CI／review 修复闭环。
Agent 在原 PR 上追加修复并验证，需求变化返回讨论；最终审阅与合并由用户完成。

修改本地工作流后格式化并执行 `agents:check` 及相关状态测试。GitHub 不保留 API Agent 或 gh-aw 编译入口。

## 项目结构与模块组织

仓库采用 Bun 驱动的 TypeScript monorepo 结构。根级产品代码放在 `src/`，测试放在 `tests/` 并镜像源码目录；独立工作区包放在 `packages/`。文档使用 `docs/`，静态资源使用 `assets/`。入口文件和共享工具配置保留在仓库根目录。不要提交 `dist/`、`node_modules/` 等生成目录、依赖缓存或本地 IDE 配置；新增工具时同步维护 `.gitignore`。

## 构建、测试与本地开发

使用 Bun 1.2.19 或更高版本。可复现命令如下：

- `bun install`：安装依赖并启用 Git hooks。
- `bunx agent-browser install`：安装 React Adapter 与 SVG Renderer 真实浏览器测试所需的 Chromium；Linux CI 使用 `bunx agent-browser install --with-deps`。
- `bun run dev`：监听根入口并持续构建到 `dist/`。
- `bun run example:dev`：构建公共依赖并单独启动 React/TanStack Router Examples Application。
- `bun run example:build`：生产构建私有 `@nodebraid/examples` Workspace Application。
- `bun run example:test`：构建并通过真实 Chromium 验收 Basic SVG Example 的页面与 Canvas 交互。
- `bun run example:check`：执行 Examples Application 类型检查、生产构建和浏览器验收。
- `bun run docs:dev`：启动中文默认、English 可切换的 Documentation Site 本地开发服务器。
- `bun run docs:quick-start`：构建公共 facade 依赖并执行站点展示的真实 Quick Start。
- `bun run docs:build`：生产构建 VitePress Documentation Site。
- `bun run docs:check`：校验公开内容、执行 Quick Start 并生产构建站点。
- `bun run docs:preview`：本地预览已经生产构建的 Documentation Site。
- `bun run build`：构建根入口，再由 `@nodebraid/core` 先构建其余 workspace 依赖并构建公共 facade。
- `bun run typecheck`：先构建 workspace package-name 类型解析所需的依赖声明，再检查根 TypeScript project 和所有 `@nodebraid/*` workspace。
- `bun run --filter '@nodebraid/diagnostics' build`：构建零依赖 Diagnostics 契约、运行声明隔离检查并验证 package-name import。
- `bun run --filter '@nodebraid/plugin-kernel' build:dependencies`：按 Kernel、Runtime 顺序生成 Kernel Runtime Plugin 构建与类型检查所需的 workspace 声明。
- `bun run --filter '@nodebraid/plugin-command' build:dependencies`：生成 Command Runtime Plugin 构建与类型检查所需的 Runtime workspace 声明。
- `bun run --filter '@nodebraid/layout-api' build:dependencies`：生成 Layout API 构建与类型检查所需的 Kernel workspace 声明。
- `bun run --filter '@nodebraid/plugin-layout' build:dependencies`：生成 Layout Runtime Plugin 构建与类型检查所需的 Layout API、Kernel Plugin 与 Command Plugin workspace 声明。
- `bun run --filter '@nodebraid/layout-dagre' build:dependencies`：生成 Dagre Layout Provider 构建与类型检查所需的 Layout API workspace 声明。
- `bun run --filter '@nodebraid/layout-elk' build:dependencies`：生成 ELK Layout Provider 构建与类型检查所需的 Layout API workspace 声明。
- `bun run --filter '@nodebraid/plugin-session' build:dependencies`：生成 Session Runtime Plugin 构建与类型检查所需的 Kernel、Runtime 与 Kernel Plugin workspace 声明。
- `bun run --filter '@nodebraid/session-api' build:dependencies`：生成 Session 值契约所需的 Kernel workspace 声明。
- `bun run --filter '@nodebraid/interaction-api' build:dependencies`：生成 Interaction Projection 值契约所需的 Kernel、Port 与 Session API workspace 声明。
- `bun run --filter '@nodebraid/port-api' build:dependencies`：生成 Port 值契约所需的 Kernel workspace 声明。
- `bun run --filter '@nodebraid/plugin-port' build:dependencies`：生成 Port Runtime Plugin 所需的 Port API 与 Runtime workspace 声明。
- `bun run --filter '@nodebraid/renderer-api' build:dependencies`：生成 Renderer 协议所需的 Diagnostics、Kernel、Port 与 Session API workspace 声明。
- `bun run --filter '@nodebraid/plugin-renderer' build:dependencies`：生成 Renderer Runtime Plugin 所需的 Renderer API、Port、Kernel 与 Session Plugin workspace 声明。
- `bun run --filter '@nodebraid/plugin-interaction' build:dependencies`：生成 Interaction Runtime Plugin 所需的 Command、Kernel、Port、Session 与 Renderer Plugin workspace 声明。
- `bun run --filter '@nodebraid/plugin-interaction' build:test-dependencies`：在生产依赖之外生成 Interaction 公共 seam 测试所需的 History Plugin workspace 声明。
- `bun run --filter '@nodebraid/canvas-fragment' build:dependencies`：生成纯 Canvas Fragment 值契约所需的 Kernel workspace 声明。
- `bun run --filter '@nodebraid/plugin-duplicate-selection' build:dependencies`：生成 Duplicate Selection Behavior 与 Shortcut Plugin 构建所需的 Command、Kernel、Session 与 Interaction workspace 声明。
- `bun run --filter '@nodebraid/plugin-duplicate-selection' build:test-dependencies`：在生产依赖之外生成 Duplicate Selection 公共 seam 测试所需的 History Plugin workspace 声明。
- `bun run --filter '@nodebraid/plugin-clipboard' build:dependencies`：生成 Clipboard Behavior 与 Shortcut Plugin 构建所需的 Fragment、Command、Kernel、Session 与 Interaction workspace 声明。
- `bun run --filter '@nodebraid/plugin-clipboard' build:test-dependencies`：在生产依赖之外生成 Clipboard 联合公共 seam 测试所需的 Duplicate Selection 与 History Plugin workspace 声明。
- `bun run --filter '@nodebraid/renderer-svg' build:dependencies`：生成 SVG Renderer Provider 生产构建所需的 Renderer API 及其传递 workspace 声明。
- `bun run --filter '@nodebraid/renderer-svg' build:test-dependencies`：生成 Renderer Plugin、Interaction、History 与 Renderer 公共 seam 浏览器场景所需的全部 workspace 声明。
- `bun run --filter '@nodebraid/plugin-history' build:dependencies`：生成 History Runtime Plugin 构建与类型检查所需的 Command 与 Kernel Plugin workspace 声明。
- `bun run --filter '@nodebraid/preset-basic' build:dependencies`：生成 Basic Canvas Composition 所需的 Interaction、History 及其传递 workspace 声明。
- `bun run --filter '@nodebraid/adapter-react' build:dependencies`：生成 React Adapter 构建与类型检查所需的 Kernel、Session 与 History Plugin workspace 声明。
- `bun run --filter '@nodebraid/adapter-react' test:browser`：构建 React Adapter 并通过真实 Chromium 验证 Runtime mount/unmount/remount、Strict Mode、竞态取消、失败与 Snapshot projection。
- `bun run format`：使用 Prettier 格式化支持的文件。
- `bun run test`：运行 Bun 测试。
- `bun run test:browser`：通过仓库锁定的 `agent-browser` 在真实 Chromium 中运行 React Adapter 与 SVG Renderer 公共 seam 测试。
- `bun run check`：依次运行 lint、类型检查、格式检查、Bun 测试、Renderer 与 Example 真实浏览器测试、构建和 Documentation Site 检查。

提交前至少运行：

- `git status --short`：确认变更范围和未跟踪文件。
- `git diff --check`：检查尾随空格及冲突标记。

若修改工具链或新增工作区脚本，请在本文件和 `README.md` 中同步记录准确命令。

## 编码风格与命名约定

优先采用所选语言的官方格式化工具，并将配置纳入版本控制。Markdown、YAML 和 JSON 使用两个空格缩进；源码遵循对应格式化器的默认规则。目录和普通文件使用 `kebab-case`，类型或组件使用 `PascalCase`，函数与变量使用该语言的惯用命名。避免无说明的缩写，并保持模块职责单一。

## 测试指南

常规测试使用 Bun 内置测试运行器，React Adapter 与 SVG Renderer 的生命周期、DOM、坐标及原生输入验收通过 `agent-browser` 驱动真实 Chromium；尚未设置覆盖率门槛。新增行为必须配套自动化测试；修复缺陷时先加入能复现问题的回归用例。Bun 测试文件使用 `tests/foo.test.ts` 命名，浏览器场景使用 `browser-tests/foo.browser.ts` 命名以避免被根 `bun test` 误发现。测试应可重复、无外部隐式依赖，并让失败直接暴露原因。

## 提交与拉取请求

历史目前只有 `Initial commit`，尚未形成稳定约定。提交信息使用简短祈使句，可采用 `feat: add flow parser`、`fix: reject invalid node` 等 Conventional Commit 前缀；每个提交只处理一个逻辑主题。

拉取请求需说明目的、主要改动和验证命令，关联相关 issue。涉及界面变化时附截图；涉及配置时列出新增环境变量，但不得提交密钥、令牌或个人配置。

## Issue 与 PR 讨论

涉及 Issue、PR 或其反馈的任务，先读取 [讨论工作流](docs/agents/discussion-workflow.md)；tracker 的存储与操作约定见 [issue-tracker.md](docs/agents/issue-tracker.md)。开始或恢复工作、提交审查结果和准备收尾时，读取相关讨论，将已确认的结论纳入需求与验证，并记录未决问题。处理反馈时关联原评论、改动和验证证据，区分已修改、已验证、已回复和等待复审。
