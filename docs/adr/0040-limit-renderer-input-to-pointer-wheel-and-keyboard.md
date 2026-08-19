---
status: accepted
---

# 将 Renderer Input 限制为 Pointer、Wheel 与 Keyboard

首版 Renderer Input 是 Pointer、Wheel 与 Keyboard 的 discriminated union。Pointer 只包含 down、move、up、cancel、Renderer 内稳定的 pointer ID、mouse/pen/touch/unknown 类型、Screen Point、World Point、变化按钮、当前按下按钮集合和修饰键；Wheel 包含同一对坐标、以逻辑屏幕像素规范化的二维增量和修饰键；Keyboard 包含 down/up、逻辑 key、物理 code、repeat 和修饰键。Input 不附带 Hit Result、native target、时间戳、pressure、tilt、composition、coalesced event 或剪贴板数据；需要目标事实时调用独立 Hit Test，新增输入种类必须由真实 Interaction 消费需求证明。
