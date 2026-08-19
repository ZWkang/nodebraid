# 01 — 创建 SVG Provider 并投影首个 Node

**What to build:** 建立可独立发布的 SVG Renderer Provider，让调用方在真实 Chromium 中把一个已有 SVG Target 绑定为 CanvasRenderer，通过 Document reset 与初始 Session 看到首个通用矩形 Node。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 同步具名 Factory 接受有效的现有 SVG Target 并返回 CanvasRenderer。
- [x] Provider 在不清空调用方内容的前提下追加稳定标记的 Projection、Edge layer 和 Node layer。
- [x] 真实 Kernel 的空 revision-zero reset 与有效 Session 先建立空 Projection，随后 reset 到真实 revision-one 单 Node View 并产生带稳定 ID 标记的矩形。
- [x] 公共 config、Factory 与 SVG-specific 错误类型有类型测试。
- [x] Chromium 测试命令进入正常仓库验证流程，对应工具链命令有准确文档。

## Answer

`@cflow/renderer-svg` 现在可以在真实 Chrome 中把调用方已有 SVG Target 绑定为同步 CanvasRenderer，保留 caller-owned `defs`，并从真实 Kernel revision-one View 投影首个带稳定 class、ID 和字面量 Geometry 的矩形 Node。公共类型、声明隔离、package-name import、pack dry-run 与由仓库锁定 `agent-browser` 驱动的 Chromium gate 均已验证通过。
