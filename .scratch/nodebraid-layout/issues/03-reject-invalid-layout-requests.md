# 03 — 在 Provider 执行前拒绝无效 Layout Request

**What to build:** 让调用方在 Layout Request 与当前 Canvas View 无法形成合法 Layout Input 时获得稳定、可诊断的结构错误，且 Provider 不会被调用。

**Blocked by:** 02 — 通过 typed Command 原子提交 full layout

**Status:** completed

- [x] 无效 mode、Fixed Node ID、缺失 Size、嵌套图和 Port 分别暴露稳定 LayoutError。
- [x] 请求与 Layout Capability 不匹配时以 `UNSUPPORTED_FEATURE` 失败，不静默降级。
