---
status: accepted
---

# Kernel 不解释或深冻结领域 data

Kernel 对自己定义的 Node、Edge、Point、Size、Endpoint、Snapshot、Change Set 和集合执行防御性复制与冻结，但不递归复制、比较或冻结 Node 与 Edge 携带的任意 `data`。`data` 由调用方按不可变值使用，净变化通过引用语义判断。这样既保护 Kernel 自有图结构，又不对领域对象施加 JSON-safe、structured clone、可遍历原型或深冻结等尚未选择的约束。
