# 04 — 实现 Pan、Wheel Zoom 与 Focus

**What to build:** 让用户在真实 SVG Canvas 中通过 primary Canvas、middle button 或 Space+primary 预览并提交 Viewport Pan，通过 Wheel 按当前 Screen Point 锚定缩放，并用 CFlow-owned Focus Input 可靠管理按键状态。

**Blocked by:** 02 — 实现完整 Selection 交互。

**Status:** ready-for-agent

- [ ] primary Canvas drag 与 middle-button drag 使用 Screen delta 产生 Viewport Pan Projection，pointerup 清 Preview 后一次写入 Session。
- [ ] Renderer Input 发布 backend-neutral focus gained/lost，SVG 不泄漏 DOM FocusEvent 或后端对象。
- [ ] Space+primary 在任意目标上启动 Pan，Gesture 类型在建立后不因 Space keyup 或单独 focus lost 改变。
- [ ] focus lost 清空 pressed-key state，丢失 Space keyup 不会使后续 pointerdown 错误进入 Pan。
- [ ] Wheel 以已确认的指数公式、敏感度和边界锚定缩放，边界上的等价结果不通知 Session。
- [ ] Interaction config 拒绝未知字段、非有限值、非法范围与 coercion，并冻结完整 effective config。
- [ ] Active Gesture 期间 Wheel 产生一次可观察 Input Rejection，不改变 Session 或 Gesture 类型。
