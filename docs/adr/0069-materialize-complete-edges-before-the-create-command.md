---
status: accepted
---

# 在 Create Edge Command 之前物化完整 Edge

Connection Interaction 在 pointerup 的最终 target 通过结构验证后，调用应用提供的窄同步 materializer 产生完整 `CanvasEdge`，再以 Edge 与 source/target Anchor evidence 执行 typed Create Edge Command。应用因此拥有 Edge ID、type 与 opaque data；Command handler 在一个同步 Kernel Transaction 中验证 Endpoint、Port、self-loop、Node 存在性与 Edge ID 可用性。CFlow 不猜测默认 Edge 值、不把外部 callback 放入 Transaction，也不因此建立通用 ID 或 Validation Registry。
