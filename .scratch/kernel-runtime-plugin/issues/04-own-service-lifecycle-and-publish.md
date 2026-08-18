# 04 — 收口 Service 生命周期与公共发布

**What to build:** 让 Kernel Plugin disposer 在依赖 Consumer 停用后关闭 Service、清空 Observer，并通过 core facade 与发布物提供完整公共 seam；重新安装必须得到全新的 revision-zero Kernel。

**Blocked by:** 03 — 串行化重入 Commit 分发.

**Status:** resolved

- [x] Consumer Owned Resource 在 Kernel Service 关闭前释放。
- [x] Service dispose 清空 Observer，旧 Service 后续调用显式失败。
- [x] 重装产生全新 Service、revision-zero View 和空 Observer 集合。
- [x] core 重导出 plugin-kernel，声明不泄漏 Cordis 或 core 反向依赖。
- [x] README、changeset、package metadata、build/pack 验证与当前能力一致。

## Answer

Kernel Plugin 用 Activation Owned Resource 关闭 Service 并清空 Observer；Runtime 先释放 Required Service Consumer，旧 Service 随后以 `SERVICE_DISPOSED` 显式失败。重装返回全新 revision-zero Service；core 重导出、声明检查、package-name import probe 与 core/plugin-kernel dry-run pack 均已通过。
