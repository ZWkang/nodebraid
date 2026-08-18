# 04 — 通过 Child Installation 组合并清理 Plugin Tree

**What to build:** 让 Canvas Composition 可以使用同一个 Plugin Graph 安装并拥有 Child Installation，显式等待必要子能力 ready，并在父 Activation 结束或任一必要子 Plugin 失败时完整回滚整棵 Plugin Tree。

**Blocked by:** 03 — 随 Required Service 可用性重新激活 Consumer.

**Status:** resolved

- [x] Plugin Context 可以安装 Child Installation，Child 自动成为父 Activation 在该登记位置拥有的 Owned Resource。
- [x] Child Installation 参与同一个 Service Token reservation、依赖环校验、Activation 顺序和状态语义，不创建独立隐藏 Runtime。
- [x] 父 Plugin 停用或 dispose 时自动释放全部 Child Installation，不能留下 detached child。
- [x] Child failed 默认只保留在 Child Installation；需要完整 Canvas readiness 的 Composition 可以显式等待 Child `whenActive()` 并让父 setup 失败。
- [x] 父 setup 因等待的 Child 失败而失败时，已经安装的 Child 和其他 Owned Resource 全部按依赖关系与登记逆序释放。
- [x] 单次 Activation 中的 disposer 即使抛出或拒绝也不会阻断其余清理，最终以包含全部错误的 AggregateError 报告。
- [x] Host dispose 按依赖安全顺序结束整个 Plugin Graph，尝试所有可执行清理，并聚合来自不同 Installation 的错误。
- [x] Plugin Installation 与 Host 的重复 dispose 复用终态结果；即使清理报错也不能重新激活或接受新安装。
- [x] 测试构造最小 Canvas-shaped Composition，验证 Provider、Consumer、Child ownership、显式 readiness、失败回滚和完整 Host shutdown 的端到端行为。

## Answer

已实现 typed Child Installation、同 Host/同 Plugin Graph 组合、父 Activation ownership、显式 readiness、整树回滚、dependency-safe LIFO cleanup、跨 Installation AggregateError 去重和终态 Host disposal。公开 seam 的 42 个测试、156 个断言及全部 package checks 通过，未修改 core facade。
