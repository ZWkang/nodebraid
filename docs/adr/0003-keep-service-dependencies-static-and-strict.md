---
status: accepted
---

# 保持 Runtime Service 依赖静态且严格

Plugin 在定义时静态声明 Required Service，首版不支持 Optional Service；同一个 Plugin Host 内，一个 Service Token 同时只能有一个 Service Provider。Provider Token 从 Plugin Installation 创建时保留到 dispose，pending 或 failed 都不会自动让给其他 Provider，冲突必须显式失败。Plugin Installation 立即返回并通过 CFlow 自己的状态快照与订阅暴露 pending、active、failed 和 disposed；pending 包含缺失 Token，failed 保留原始错误，同一状态期间保持 Snapshot 引用稳定，不能泄漏 Cordis Fiber 状态。setup 失败后 failed 是本次 Installation 的终态，调用方必须 dispose 后重新 install，避免隐式重试循环。
