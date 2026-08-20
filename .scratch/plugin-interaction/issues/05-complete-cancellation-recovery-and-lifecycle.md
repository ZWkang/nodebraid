# 05 — 完成取消、恢复与生命周期

**What to build:** 让 Interaction 在真实 Pointer 取消、意外丢失 Capture、额外 Pointer、外部状态变化、Plugin unload、Required Service 重载和 Renderer 同步失败中都能显式结束行为、释放资源并保留完整失败证据。

**Blocked by:** 03 — 实现多 Node Drag 与可逆提交；04 — 实现 Pan、Wheel Zoom 与 Focus。

**Status:** resolved

- [x] 真实 pointercancel 与 unexpected lost capture 各自恰好取消一次 Active Gesture，不提交 Node 或 Viewport，也不与正常 up/release 重复。
- [x] 第二 Pointer 不 Capture、不替换当前 Gesture，从 rejected down 跟踪到 terminal input 且只发布一次安全 Diagnostic。
- [x] Node/Viewport Projection Baseline 失效时 Renderer 先清 Preview，Interaction 取消 Stale Gesture，不将预期取消误报为 Fault。
- [x] 内部 Renderer 同步失败只做一次显式 reset+Session recovery，再失败进入 `SYNC_FAILED`、停止 Input 并拒绝交互控制。
- [x] Interaction cleanup 按 closing、停订阅、清 Binding、释放 Capture、清状态、等待 Command Registration 顺序尝试全部步骤并聚合失败。
- [x] Active Gesture 期间 unload 或依赖消失不留 Preview、Capture、subscription 或 Command registration，恢复后的新 Activation 从 idle 开始。
- [x] 晚到 Promise continuation 不跨 Activation 写状态，直接错误、取消 Diagnostic、Command Fault 与 cleanup AggregateError 均恰好暴露一次。
