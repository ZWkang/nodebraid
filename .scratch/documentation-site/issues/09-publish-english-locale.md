# 09 — 发布完整 English locale

**What to build:** 在保持简体中文为默认入口的同时，为外部 TypeScript 开发者提供内容对等的 English locale、语言切换、英文导航与英文全文搜索。

**Blocked by:** 08 — 发布 GitHub Pages.

**Status:** completed

- [x] 首页、Quick Start、能力地图、五个能力族、15 个模块页、当前状态和 Roadmap 都有英文对应页面。
- [x] 简体中文继续位于根路径，English 位于 `/en/`，两种 locale 可通过站点语言菜单互相切换。
- [x] 中英文导航、sidebar、搜索 UI、页脚和页面 metadata 与当前 locale 一致。
- [x] 英文内容保持同一事实边界：packages 未发布、无 committed concrete Renderer Provider、计划能力不冒充当前能力。
- [x] 内容校验强制检查中英文页面一一对应，并继续校验 15 个 workspace package。
- [x] 生产 `/cflow/` base、中文与英文搜索、桌面与移动端语言切换通过真实浏览器验收。
