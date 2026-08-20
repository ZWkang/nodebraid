---
status: accepted
---

# reset 时清除 Interaction 并在恢复失败后停止

Renderer 的任意完整 Document reset 都原子清除 Interaction Projection，因为任意 revision 的新 Baseline 不能继承旧 Gesture Preview。`@cflow/plugin-renderer` 内部状态同步无法向原调用者返回失败时，先报告原始 Fault，再且只再尝试一次显式的当前 Document reset 与 Session 重建；recovery 失败保留原失败与恢复失败并进入 Renderer Sync Failure。该 Activation 随后停止输入转发并以 `SYNC_FAILED` 拒绝命中、焦点、Capture 与 Projection 更新，只保留订阅、Binding 与 Renderer 清理；不循环重试、不设 timeout，只有依赖重载后的新 Activation 恢复能力。
