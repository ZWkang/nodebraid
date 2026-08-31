---
status: accepted
---

# 让应用拥有 Clipboard 文本与传输 Adapter

NodeBraid Clipboard Plugin 只依赖应用注入的 abort-aware `readText`/`writeText` Transport、Canvas Fragment Text Codec 与 fresh-ID materializer，不直接访问 `navigator.clipboard`，也不提供任意 `unknown` 的通用 JSON codec 或静默内存 fallback。Codec 独自拥有文本 envelope、版本、opaque data 编解码与外部引用规则；Plugin 仍验证解码后的 Fragment、当前目标冲突、单 Transaction 与 post-Commit Selection，因此浏览器和测试 Adapter 可以替换而不会把跨应用序列化语义固化进框架。
