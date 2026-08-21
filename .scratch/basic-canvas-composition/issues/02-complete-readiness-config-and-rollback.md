# 02 — 完成 readiness、配置与失败回滚

**What to build:** 让应用能够配置 Interaction policy，并让 Basic Canvas Composition 在异步 Renderer 创建、配置错误或任一 Child Activation 失败时提供真实 readiness、原始失败身份与完整回滚。

**Blocked by:** 01 — 建立首个 Basic Canvas Composition 闭环。

**Status:** resolved

- [x] Composition creation 接受小而只读的 Interaction options，不接受任意 Plugin、Host 或 Diagnostics 配置。
- [x] 创建时固定 CFlow-owned Interaction option shell，Provider config 继续遵循 Renderer Factory 的 readonly 值约定。
- [x] 未完成的 async Renderer Factory 使 Composition 保持非 active，全部 Child ready 后才完成 `whenActive()`。
- [x] 非法 Interaction config 以原始 `InteractionError` 使 Composition failed，不被 preset 包装。
- [x] 任一 awaited Child 失败会释放全部已创建 Child Installation；失败父级不自重试，恢复使用新的 Installation。

## Answer

Composition creator 现接受只包含 `interaction` 的 readonly options，拒绝 malformed 或 unknown top-level 字段，并在创建时浅复制、冻结合法 Interaction shell。真实 Interaction Activation 继续拥有字段与数值校验，因此 `InteractionError` 身份保持不变。父 Installation 会等待 async Renderer Factory；Factory 原始失败会回滚 Child tree 且不会自重试，恢复使用新的 Composition Installation。失败父级仍由调用方显式 dispose，但回滚后不持有阻止 replacement 的 preset-level reservation。
