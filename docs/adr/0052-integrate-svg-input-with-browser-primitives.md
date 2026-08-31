---
status: accepted
---

# 使用显式策略与浏览器原生输入集成

`@nodebraid/renderer-svg` 通过 Factory config 为 pointer、wheel、keyboard 和 context menu 分别配置静态 `preventDefault` 与 `stopPropagation`，默认全部为 `false`，且不自动改写 `touch-action`；此外，Renderer Input Subscription 的同步 Disposition listener 在行为入队前运行并可在同一个原生 handler 返回前精确触发 `preventDefault()`，使动态 Shortcut Binding 的安装与释放决定默认行为控制，即使 Input 由另一个 listener 重入发布，也不把原生 Event 交给 Interaction。Provider 使用真实 DOM Focus 与 Pointer Capture：Target 无 `tabindex` 时临时添加 `tabindex="-1"` 并在释放时恢复，`focus()` 防止滚动且只在 Target 实际拥有焦点时发布 Keyboard Input，Capture 只接受 Active Pointer 并对重复 capture/release 幂等。Wheel delta 以稳定规则归一为 CSS pixels：pixel 原值、line 乘 `16`、page 乘当前 Target-local 高度；Viewport zoom 与 `devicePixelRatio` 不参与换算。行为 listener 以广度优先队列完成当前及已排队的通知；listener 错误不阻断后续 listener、Input 或已产生的 Disposition，Provider 先应用 Disposition 再显式暴露单个原始异常或 `AggregateError`。
