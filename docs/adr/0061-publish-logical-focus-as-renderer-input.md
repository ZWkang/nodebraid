---
status: accepted
---

# 将逻辑 Focus 转换发布为 Renderer Input

Renderer Input 在 Pointer、Wheel 与 Keyboard 之外新增 backend-neutral Focus Input，只以 `focus.gained` 和 `focus.lost` 表达 Renderer Focus 转换，不携带 DOM target、related target 或原生事件。该决定修订 ADR 0040 的最小 Input union：只有 key down/up 无法在 Target 失焦并丢失 keyup 时可靠结束 Space 等按键状态，而超时、下一次 pointerdown 猜测或暴露原生 FocusEvent 都会引入静默降级或后端泄漏。Interaction 在 `focus.lost` 时清空按键状态；已由 Pointer Capture 驱动的 Active Gesture 保持建立时的类型，仅在 Pointer terminal input、意外丢失 Capture 或 lifecycle cleanup 时结束。
