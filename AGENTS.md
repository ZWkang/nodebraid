# Repository Guidelines

## 项目结构与模块组织

仓库采用 Bun 驱动的 TypeScript monorepo 结构。根级产品代码放在 `src/`，测试放在 `tests/` 并镜像源码目录；独立工作区包放在 `packages/`。文档使用 `docs/`，静态资源使用 `assets/`。入口文件和共享工具配置保留在仓库根目录。不要提交 `dist/`、`node_modules/` 等生成目录、依赖缓存或本地 IDE 配置；新增工具时同步维护 `.gitignore`。

## 构建、测试与本地开发

使用 Bun 1.2.19 或更高版本。可复现命令如下：

- `bun install`：安装依赖并启用 Git hooks。
- `bun run dev`：监听根入口并持续构建到 `dist/`。
- `bun run build`：构建根入口。
- `bun run format`：使用 Prettier 格式化支持的文件。
- `bun run test`：运行 Bun 测试。
- `bun run check`：依次运行 lint、类型检查、格式检查、测试和构建。

提交前至少运行：

- `git status --short`：确认变更范围和未跟踪文件。
- `git diff --check`：检查尾随空格及冲突标记。

若修改工具链或新增工作区脚本，请在本文件和 `README.md` 中同步记录准确命令。

## 编码风格与命名约定

优先采用所选语言的官方格式化工具，并将配置纳入版本控制。Markdown、YAML 和 JSON 使用两个空格缩进；源码遵循对应格式化器的默认规则。目录和普通文件使用 `kebab-case`，类型或组件使用 `PascalCase`，函数与变量使用该语言的惯用命名。避免无说明的缩写，并保持模块职责单一。

## 测试指南

测试使用 Bun 内置测试运行器，尚未设置覆盖率门槛。新增行为必须配套自动化测试；修复缺陷时先加入能复现问题的回归用例。测试文件使用 `tests/foo.test.ts` 命名。测试应可重复、无外部隐式依赖，并让失败直接暴露原因。

## 提交与拉取请求

历史目前只有 `Initial commit`，尚未形成稳定约定。提交信息使用简短祈使句，可采用 `feat: add flow parser`、`fix: reject invalid node` 等 Conventional Commit 前缀；每个提交只处理一个逻辑主题。

拉取请求需说明目的、主要改动和验证命令，关联相关 issue。涉及界面变化时附截图；涉及配置时列出新增环境变量，但不得提交密钥、令牌或个人配置。
