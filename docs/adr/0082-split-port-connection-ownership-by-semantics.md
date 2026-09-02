---
status: accepted
---

# 按语义拆分 Port Connection ownership

Renderer Provider 接收与 Document update 对齐的 Port Snapshot，并独立拥有 Port Geometry、投影和 Hit Result；SVG reference Provider 将 source/target Port 分别排列在 Node 右/左边界。Interaction 把 Port 或 node-level Anchor Hit 解释为 Connection Endpoint，验证 source/target role、self-loop 与 Gesture 期间定义稳定性，并让应用 materializer 产生完整 Edge 后通过一次 Create Edge Command 和同步 Kernel Transaction 重验并提交。没有 Port 的 Node 保留 node-level Connection；带 Port 的 Node 不生成 node-level Anchor，缺失或 role 不匹配的 Port 会显式失败而不会降级到 Node 中心。
