# 08 — 规范化真实浏览器 Input

**What to build:** 让 SVG Target 的真实 Pointer、Wheel、Keyboard 与 context-menu 事件通过类型化 config 的默认行为策略进入 CFlow Renderer Input seam，不携带原生事件或 Target。

**Blocked by:** 06 — 投影 Session 与 SVG 坐标系统.

**Status:** resolved

- [x] 真实 Chromium Pointer events 规范化 type、ID、button、pressed buttons、modifiers、Screen Point 和 World Point。
- [x] pixel Wheel delta 保持原值，line 乘十六 CSS pixels，page 乘 Target-local 高度。
- [x] Viewport zoom 与 devicePixelRatio 不影响 Wheel delta 规范化。
- [x] Keyboard Input 只在 Target 实际拥有焦点时发布。
- [x] pointer、wheel、keyboard 和 context menu 的 preventDefault/stopPropagation 可独立显式配置，默认全部为 false。
- [x] context menu 策略不伪造新 Renderer Input，Provider 不自动改写 touch-action。

## Answer

SVG Target 现在通过真实 DOM listeners 发布 CFlow-owned Pointer、Wheel 与 Keyboard Input，坐标使用当前 Target-local Screen Point 与 accepted Viewport World Point。Wheel 实现 pixel/line/page 的 1/16/Target-height 规则，Keyboard 只在真实焦点下发布；四类 DOM 默认行为策略均显式且默认为 false，context menu 不进入 Input union。
