# 01 — 运行并释放第一个 Cordis-backed Plugin

**What to build:** 让 CFlow 调用者可以创建一个隔离的空 Plugin Host，定义并安装一个不依赖 Runtime Service 的 Plugin，观察它完成 Activation 或显式失败，并安全结束 Plugin Installation 与整个 Host。Cordis 承担真实生命周期工作，但不会出现在 CFlow 的公开 interface 中。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 新增可独立发布和测试的 `@cflow/runtime-cordis` package，并精确依赖实现时 npm latest 的 Cordis 4 预发布版本。
- [x] 公开 CFlow 自己的 Plugin、Plugin Context、Plugin Installation、Plugin Host、Installation Snapshot 与结构性错误类型，不公开 Cordis Context、Fiber、Service 或 effect 类型。
- [x] `createPluginHost()` 创建彼此隔离且不包含任何隐式 Canvas 能力的空 Host。
- [x] `definePlugin()` 支持固定配置以及同步或异步 setup；同一个 Plugin 定义可以形成多次独立 Installation。
- [x] `install()` 在执行用户 setup 前返回 Installation，并公开稳定的 pending、active、failed 与 disposed Snapshot。
- [x] setup 成功后 Installation 进入 active；setup 抛出或拒绝后进入 failed，并保留原始错误且不影响其他 Installation。
- [x] Plugin Context 为每次 Activation 提供独立 AbortSignal 和 Owned Resource 登记；Owned Resource 支持同步或异步清理并按登记逆序释放。
- [x] Plugin Installation 与 Plugin Host 的 dispose 均为异步、幂等、终态操作；Host 开始 dispose 后的新安装显式失败。
- [x] 状态订阅只报告 CFlow Snapshot 变化，解除订阅幂等，同一状态期间 Snapshot 保持相同引用。
- [x] 使用真实 Cordis-backed Host 通过公开 interface 测试以上行为，不建立 fake Host，也不断言 Cordis 内部状态。

## Answer

已实现首个 Cordis-backed Plugin 完整生命周期，并通过公开 Plugin Host seam 验证 10 个行为测试、38 个断言、类型检查、构建、格式、lint 与声明泄漏检查。Cordis 精确锁定为 `4.0.0-rc.8`，未提前实现后续 ticket 的 Runtime Service、Child Installation 或 core 重导出。
