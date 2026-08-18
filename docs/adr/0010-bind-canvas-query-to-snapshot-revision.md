---
status: accepted
---

# 将 Canvas Query 绑定到 Canvas Snapshot revision

Kernel 的公开读取返回由同一 revision 的 Canvas Snapshot 与 Canvas Query 组成的 Canvas View，不提供会随未来提交变化的 live Query。成功 Transaction 返回包含 before View、after View 与 Change Set 的完整 commit evidence，无净变化则返回 `null`。这使 Runtime、Renderer、History 和异步消费者不会把旧 Snapshot 与新 Query 结果混用，也不需要在提交后重新读取 Kernel 来拼装传播数据。
