---
status: accepted
---

# 将诊断观察与错误传播分离

NodeBraid 定义宿主可接管的统一诊断事件协议，但不拥有 console、文件、Sentry 或 OpenTelemetry 等具体输出与持久化策略。Plugin Host 与 Runtime Plugin 只在拥有并处置失败的语义边界自动产生一次诊断，例如将失败写入 Installation 状态、隔离外部监听者异常或完成清理错误聚合；错误构造、普通抛出和重新抛出不产生诊断。Kernel、Layout API 与算法 Provider 等纯计算层保持无副作用，由 Runtime adapter 或直接调用者拥有观察边界。

调用失败仍通过 throw 或 reject 返回调用者；Observer 与 Subscriber 等外部回调的异常仍在不破坏已提交状态、不阻塞其他监听者的前提下显式上报；诊断事件只负责观察，成功写入诊断出口不能消费、替换或改变原有失败。

每个 Plugin Host 在创建时独立接收宿主提供的诊断出口，并通过 Plugin Context 向 Plugin 提供附带 Host、Installation 与 Plugin 上下文的作用域化诊断能力。诊断不是 Runtime Service，也不使用全局可变 logger，从而能够覆盖 Service 激活前的 Host 失败，并保持多个 Canvas Runtime 之间的配置与上下文隔离。

诊断出口同步接收带稳定事件名、级别、时间、Host 内序号、作用域、安全属性与可选原始错误的不可变事件；异步上传、批量、过滤和持久化留给具体 Adapter。未配置出口时普通诊断被明确禁用，不回退到 console。无法通过调用结果返回的 Fault 另行交给 Host-scoped Fault Reporter；默认 Reporter 沿用平台 reportError 或异步显式抛出，因此 Diagnostic Sink 成功不能吞掉 Fault。Sink 或 Reporter 自身失败必须显式上报且不得递归进入同一个失败出口。
