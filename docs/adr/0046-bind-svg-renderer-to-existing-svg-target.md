---
status: accepted
---

# 将 SVG Renderer 绑定到现有 SVG Target

`@nodebraid/renderer-svg` 的 Factory 接受调用方已有的 `SVGSVGElement`，而不接受通用 `HTMLElement` 并代为创建 SVG 根元素。调用方保持 Target 的所有权与存在周期，Renderer Instance 只在自身生命周期内绑定该 Target；这使 Target 所有权明确，也避免 Factory 同时承担容器布局与 SVG 根元素创建策略。
