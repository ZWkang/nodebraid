# 08 — 发布完整 Layout facade 与包契约

**What to build:** 让普通消费者从 NodeBraid 公共 facade 使用通用 Layout 能力，同时保持 Dagre、ELK 为显式选择的可选 Provider 包。

**Blocked by:** 05 — 通过 Dagre 完成真实 full layout; 07 — 让 ELK 赢得 incremental 与 Fixed Node capability

**Status:** completed

- [x] Core 只重导出 Layout API 与 Runtime 集成能力，不把具体 Provider 引入 facade 声明或依赖。
- [x] 四个包的类型、声明、README、依赖方向、构建和发布内容全部通过验证。
