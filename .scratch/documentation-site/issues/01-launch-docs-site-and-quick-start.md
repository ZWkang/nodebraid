# 01 — 交付中文文档站与可运行 Quick Start

**What to build:** 为外部 TypeScript 开发者交付第一条完整文档体验：从中文产品首页进入源码 checkout Quick Start，通过真实公共 facade 创建并运行最小 Canvas Runtime，同时让同一个顶层检查验证示例与生产站点。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] 中文 VitePress 站点可开发、生产构建和本地预览，并提供定制首页、响应式导航、深浅主题与本地搜索。
- [x] 首页准确定位 CFlow 为可组合、Renderer-agnostic 的 headless flow canvas engine，并把 Quick Start 作为主要入口。
- [x] Quick Start 只使用公共 core facade，真实提交一个 Node，等待 Activation，输出 revision 与 Node 数量并释放 Plugin Host。
- [x] Quick Start 明确采用源码 checkout，说明 packages 尚未以本项目身份发布，且不出现会安装错误项目的 npm 命令。
- [x] 一个顶层文档检查同时执行 Quick Start 与生产构建，并接入仓库总检查。
- [x] 生产构建拒绝死链或无效站点配置，不启用静默忽略。
