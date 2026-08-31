---
status: accepted
---

# 通过单一 Interaction authority 组合快捷键贡献

行为相关 Plugin 通过 Activation-scoped Interaction Shortcut Binding 把规范化 Keyboard Input 条件关联到无输入 typed Command，而不自行订阅 Renderer Input；现有 Interaction Plugin 继续拥有唯一输入解释、Active Gesture 仲裁、绑定冲突与 capability-unavailable rejection。一个 live Binding 匹配时，即使因 repeat、Active Gesture 或 Command Registration 暂不可用而明确拒绝，也通过当前 Renderer Input Subscription 的 backend-neutral Input Disposition 请求阻止后端默认动作；`COMMAND_NOT_FOUND` 转换为 capability-unavailable 而不进入 Fault，其余 Command rejection 由 Shortcut host 的稳定 command fault 路径报告。Binding dispose 后立即停止新匹配、abort 由它发起的活跃 Command 并等待全部调用结束，期间保留 Binding reservation；fresh Activation 建立新 Registration，旧 handle 不复活。同一 Binding 的第二个 live Registration 显式失败，不按优先级、安装顺序或广播执行解决冲突。这样 Duplicate Selection 等行为及其快捷键可以独立安装和释放，Toolbar 或菜单也能复用同一 Command，同时不暴露 Interaction 内部状态、不创建第二个输入 authority，也不建立通用 Tool/Behavior Registry。
