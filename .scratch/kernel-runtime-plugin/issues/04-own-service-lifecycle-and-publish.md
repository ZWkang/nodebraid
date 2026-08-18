# 04 — 收口 Service 生命周期与公共发布

**What to build:** 让 Kernel Plugin disposer 在依赖 Consumer 停用后关闭 Service、清空 Observer，并通过 core facade 与发布物提供完整公共 seam；重新安装必须得到全新的 revision-zero Kernel。

**Blocked by:** 03 — 串行化重入 Commit 分发.

**Status:** open

- [ ] Consumer Owned Resource 在 Kernel Service 关闭前释放。
- [ ] Service dispose 清空 Observer，旧 Service 后续调用显式失败。
- [ ] 重装产生全新 Service、revision-zero View 和空 Observer 集合。
- [ ] core 重导出 plugin-kernel，声明不泄漏 Cordis 或 core 反向依赖。
- [ ] README、changeset、package metadata、build/pack 验证与当前能力一致。
