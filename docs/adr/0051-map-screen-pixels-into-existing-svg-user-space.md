---
status: accepted
---

# 将 Target-local Screen pixels 映射到现有 SVG user space

`@cflow/renderer-svg` 保持 Screen Point 的 Target-local CSS pixel 语义，并通过 SVG Target `getScreenCTM()` 的可逆矩阵把投影映射到现有 SVG user space，而不要求一个 user unit 等于一个 CSS pixel。因此首版可与静态 `viewBox`、`preserveAspectRatio` 和可逆 CSS transform 共存，不改写 Target 的坐标系也不创建嵌套 SVG root；Provider 通过 `ResizeObserver` 以及每次更新、输入和命中刷新映射。Factory 显式拒绝未连接、无非零可视尺寸或 CTM 不可逆的 Target；未伴随 resize 或 Provider 操作的动态祖先 transform 不承诺立即重投影。
