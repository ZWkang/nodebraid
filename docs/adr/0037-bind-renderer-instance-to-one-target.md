---
status: accepted
---

# 将 Renderer Instance 绑定到一个 Target

Renderer Factory 创建时把一份 Renderer Instance 绑定到一个固定 Target，公共 interface 不提供 mount、unmount 或 remount；切换 Target 或 Provider 必须终态释放旧实例并创建新实例。`dispose()` 异步幂等，调用后实例立即对更新、命中和新增订阅显式报告已释放，随后完成后端监听、场景对象与 Target 资源清理。Renderer Runtime Plugin 将实例登记为 Activation Owned Resource；Provider 创建失败保持原始失败身份，释放失败继续参与 Host 的完整清理和错误聚合，不能用假成功掩盖资源状态。
