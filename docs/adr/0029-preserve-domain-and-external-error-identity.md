---
status: accepted
---

# 统一结构性错误契约并保留失败身份

CFlow 自己产生的结构性错误共同继承泛型 CFlowError 基类，由基类统一稳定的 `domain`、领域内 `code`、只读详情与可选原因，同时保留 KernelError、PluginHostError、LayoutError 等领域公开类型。`domain` 与 `code` 的组合是跨包和跨进程的错误身份；Error `name` 只表达具体类，不承担协议身份，也不在错误上附加 severity、retryable 或传输状态等处理策略。

用户 Callback、Command Handler、Plugin Setup 与 Abort reason 等外部失败继续原样传播，不统一包装成单一错误类型；诊断与序列化能力通过旁路观察描述这些原始失败，不能改变其对象身份。

CFlow 结构性错误的 details 只接受可安全序列化的有限数值、字符串、布尔值、null、数组和字符串键记录，并由基类递归复制和冻结；不得放入 Service Token、函数、类实例、循环引用或任意业务数据。单一下游失败通过 cause 保留，多个并列失败通过 AggregateError.errors 保留，聚合树不再默认递归拍平，以免丢失清理阶段和中间语义。
