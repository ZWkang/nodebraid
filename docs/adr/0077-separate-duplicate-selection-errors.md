---
status: accepted
---

# 分离 Duplicate Selection 错误并保留外部失败身份

`@nodebraid/plugin-duplicate-selection` 以 domain `plugin.duplicate-selection` 的 `DuplicateSelectionError` 和 `INVALID_CONFIG`、`INVALID_MATERIALIZATION`、`STALE_DUPLICATE`、`SELECTION_UPDATE_FAILED` 表达自身配置、ID mapping、源证据冲突与 post-Commit Session failure；最后一种错误只在安全 details 中携带 `committedRevision` 并通过 cause 保留原失败。应用 materializer 自己抛出的异常以及未知 Kernel、Command 或外部失败保持原始对象身份，不包装成已知 Duplicate code；直接 Command 调用把失败返回调用者，Input-driven Shortcut 对无法返回的失败使用既有 capability rejection 或 command fault seam。
