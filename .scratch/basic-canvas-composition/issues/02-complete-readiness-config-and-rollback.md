# 02 — 完成 readiness、配置与失败回滚

**What to build:** 让应用能够配置 Interaction policy，并让 Basic Canvas Composition 在异步 Renderer 创建、配置错误或任一 Child Activation 失败时提供真实 readiness、原始失败身份与完整回滚。

**Blocked by:** 01 — 建立首个 Basic Canvas Composition 闭环。

**Status:** ready-for-agent

- [ ] Composition creation 接受小而只读的 Interaction options，不接受任意 Plugin、Host 或 Diagnostics 配置。
- [ ] 创建时固定 CFlow-owned Interaction option shell，Provider config 继续遵循 Renderer Factory 的 readonly 值约定。
- [ ] 未完成的 async Renderer Factory 使 Composition 保持非 active，全部 Child ready 后才完成 `whenActive()`。
- [ ] 非法 Interaction config 以原始 `InteractionError` 使 Composition failed，不被 preset 包装。
- [ ] 任一 awaited Child 失败会释放全部已创建 Child Installation，并允许显式 dispose 后重新安装。
