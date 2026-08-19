# 07 — 提供语义 Hit Test

**What to build:** 让 Interaction 使用当前 SVG Projection Geometry 对 Target-local Screen Point 进行确定命中，不受调用方 CSS、装饰 DOM 或浏览器 element hit testing 影响。

**Blocked by:** 02 — 投影直线 Edge 并拒绝不完整 Geometry; 06 — 投影 Session 与 SVG 坐标系统.

**Status:** resolved

- [x] 非有限 Screen Point 以 `INVALID_SCREEN_POINT` 失败，Target 外返回 `null`。
- [x] Target 内先按逆规范 ID 顺序命中 Node，然后命中 Edge，剩余区域返回 Canvas。
- [x] Edge 使用默认四 CSS pixel 容差，并接受非负有限 config 覆盖。
- [x] 命中返回与当前已接受 Viewport 一致的 World Point。
- [x] CSS stroke/fill、调用方 SVG 内容和 devicePixelRatio 不改变语义命中。
- [x] 首版不返回伪造的 Port Hit Result。

## Answer

`hitTest` 现在仅根据已接受 Document/Session 语义 Geometry 运行：先反算 World Point，再按逆规范 ID 命中 Node，随后以 Target-local CSS pixel 容差命中 Edge，最后区分 Canvas 与 Target 外。默认容差为 4px 且可显式配置，CSS、devicePixelRatio 与 caller-owned SVG 内容均不改变结果。
