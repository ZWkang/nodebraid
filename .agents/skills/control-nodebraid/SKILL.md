---
name: control-nodebraid
description: >
  Verify NodeBraid capabilities using existing package tests, real browser
  suites and the Examples Application. Use when choosing checks for a change,
  reproducing a Canvas interaction, or collecting verification evidence.
---

# Control NodeBraid

声明验证结论前应用 [Prove It Works](../principle-prove-it-works/SKILL.md)；汇报性能或评测数字时应用 [Explain the Number](../principle-explain-the-number/SKILL.md)。其他原则按[项目索引](../../../docs/agents/principles.md)选择，继续复用本 skill 的验证地图和现有证据协议。

从要证明的行为出发，在[能力验证地图](references/capabilities.md)中选择对应能力，只读取相关测试和配方。地图记录已有入口与观察方式，不代表这些检查在当前 checkout 已经通过。

## 选择验证层级

| 要证明什么                                                            | 使用什么证据                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| 当前开发变更及其消费者是否通过检查                                    | `bun run check:affected`；先用 `--plan` 查看自动选择的范围    |
| Transaction、Command、Session、History、Layout 或 Plugin 生命周期契约 | 地图指向的公共 interface 测试；按对应 package 的脚本构建依赖  |
| SVG Geometry、命中、焦点、Pointer Capture、鼠标或键盘交互、React 挂载 | 现有真实浏览器 suite；需要检查现场时使用 Examples Application |
| 文档展示的安装组合与示例可运行                                        | `bun run docs:check`，其中包含真实 Quick Start                |
| 正式交付的工程验证                                                    | 仓库要求的 `bun run check`；托管任务继续使用既有验证记录协议  |

Command 执行成功只证明命令层行为。验证拖拽、连线或快捷键时，还需真实浏览器输入及状态断言。截图补充外观证据，页面 ready 或进程退出成功本身不证明用户行为正确。

## 准备当前 checkout

所有命令从仓库根目录执行。先读取 `git status --short --branch` 和 `git rev-parse HEAD`，记录当前 checkout 与已有改动；遵循[领域文档约定](../../../docs/agents/domain.md)和相关 ADR。

- 使用仓库要求的 Bun 版本。缺少依赖时运行 `bun install --frozen-lockfile`，保留安装失败的原始原因。
- 浏览器 suite 使用仓库锁定的 `agent-browser`；缺少 Chromium 时按 [AGENTS.md](../../../AGENTS.md) 运行 `bunx agent-browser install`，Linux CI 使用其 `--with-deps` 形式。
- package-name imports 依赖生成的 workspace 声明。采用地图中的构建前置或 package 的 `test` 脚本；遇到缺少 `dist` 的错误时，核对依赖构建，而不是改成私有源码导入。
- 测试文件、脚本和 fixture 是事实源。地图引用已失效或当前功能没有对应验证时，明确报告缺口，不把相近能力的结果当作已覆盖。

## 执行现有验证

开发迭代运行 `bun run check:affected`，默认比较 `HEAD`，包含暂存、未暂存和未跟踪文件；`--base main` 从 `main` 与 `HEAD` 的 merge-base 比较，`--plan` 只展示范围。它按 workspace 的生产和开发依赖选择消费者，并选择静态 import 相关的根组合测试、浏览器 suite 和文档检查；共享变更触发全量，具体范围见地图。

构建调度在单次调用内按依赖拓扑去重，不跨次缓存。地图中的普通 package 入口会准备依赖；`:self` 只供已准备依赖的整套调度使用。现有 browser suite 按整套场景运行，退出时清理服务和浏览器，没有按能力名称筛选或保留现场的参数。

需要交互复现时运行：

```bash
bun run example:dev
```

使用该进程实际输出的地址打开 `/basic-svg?lang=en`，按地图配方准备状态、等待 ready、操作并断言。`bun run dev` 只监听根入口构建，不启动 Examples Application。英文参数用于固定配方中的控件名称和显示值。

配方中的 DOM 读取用于观察；通过正常控件和真实输入驱动交互。需要公共服务的结构化 Snapshot 或故障注入时，使用已有契约测试。Example 的显示指标不是完整 Canvas Snapshot，也没有通用的全局 Runtime 控制接口。

## 保留可复核的结果

在任务现有日志或临时输出目录中保存必要证据，不提交生成文件：

- 运行的 checkout/HEAD、相关未提交改动、实际命令、退出码和原始失败输出。
- 交互验证的地址、初始状态、操作、预期与实际状态；涉及视觉变化时保存实际页面截图。
- 失败时保留浏览器 console/error 和可取得的现场状态；suite 已经关闭现场时如实说明。需要复现时重新启动 Example，不能声称已经自动保存截图或录像。

结束时区分：哪些行为通过、哪些失败、哪些未运行。定向检查不能替代仓库要求的完整 `bun run check`。托管任务完成定向检查与双轴 review 后，由 `agents:run verify` 执行本次交付的全量检查，不提前人工重复执行；新尝试仍运行真实检查。提交身份、原始日志及发布验证沿用[现有协议](../../../docs/agents/agentic-workflows.md)，此 skill 不授予发布、回复或合并权限。

## 维护地图

能力、fixture 或验证入口变化时，一并核对对应行的命令、文件链接、选择器与预期值。新增配方必须有当前源码或真实运行依据；尚未覆盖的能力直接标记缺口。第一版通过人工核对引用维护地图，不提供 `map --check` 或新的 CLI。
