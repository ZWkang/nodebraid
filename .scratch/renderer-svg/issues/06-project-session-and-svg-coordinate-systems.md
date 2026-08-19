# 06 — 投影 Session 与 SVG 坐标系统

**What to build:** 让 SVG Renderer 在现有 viewBox 和可逆 CSS transform 下仍以 Target-local CSS pixels 解释 Screen Point，并将有效 Selection 与 Viewport 作为一次原子 Session 更新投影。

**Blocked by:** 01 — 创建 SVG Provider 并投影首个 Node.

**Status:** resolved

- [x] Session 在 Document Baseline 之后更新 Selection 标记和 Viewport transform。
- [x] 无 Baseline、非规范或重复 Selection、悬空 ID、非有限 Viewport 或非正 zoom 都原子失败。
- [x] Screen Point 以 Target 可视区域左上角为原点并使用 CSS pixels。
- [x] 现有 viewBox、preserveAspectRatio 与可逆 CSS transform 通过 screen CTM 映射，Provider 不改写调用方坐标系。
- [x] ResizeObserver 与每次操作刷新映射；脱离、零尺寸或不可逆 Target 显式报告 unavailable。

## Answer

Session 现在只在存在 Document Baseline 且 Selection 可解析、规范、唯一，Viewport 有限且 zoom 为正时原子接受。Provider 通过 Target-local CSS pixels 与可逆 screen CTM 组合现有 SVG user space 和 Session Viewport，ResizeObserver 会刷新 matrix；Target 脱离、零尺寸或奇异时保持旧 Session/DOM 并显式报告 `TARGET_UNAVAILABLE`。
