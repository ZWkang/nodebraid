---
status: accepted
---

# 在事务前判定应用连接规则

Interaction 在鼠标预览和 Create Edge Command 两处使用应用提供的同一同步规则。预览与只读反馈共享一次候选判定，Command 在提交前使用最新 CanvasView 与 PortSnapshot 独立判定。Port 定义与规则均在事务外求值；事务内在写入前后核对已接受的依据，允许正常的提交后观察者继续修改图。

PluginDefinition 的可选 captureConfig 由 Host 在每次 install 时调用一次，返回值传给该 Installation 的每次 setup。Interaction 在此捕获规则引用，同时保留既有 materializer 在 Activation 时验证的契约。不同 Installation 即使接收同一个配置对象，也独立捕获。
