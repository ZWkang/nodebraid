---
status: accepted
---

# 提取内存 Canvas Fragment 值契约

在 Duplicate Selection 与 Clipboard 成为两个真实消费者后，NodeBraid 将 selected-Node induced subgraph 的捕获、验证与 fresh-ID materialization 提取到纯 `@nodebraid/canvas-fragment` package。Fragment 保留规范顺序、原 Selection 成员、nested parent、port-qualified Endpoint 与 opaque data 引用，只带运行时类型 discriminator，不带持久化 schema version；它不依赖 Runtime、Renderer、浏览器或 Cordis，也不承诺 Serialized Document 或跨版本文本兼容性。
