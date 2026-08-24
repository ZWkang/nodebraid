---
status: accepted
---

# 只拥有 SVG Target 内的投影子树

`@nodebraid/renderer-svg` 在调用方所有的 SVG Renderer Target 内创建并拥有一个带稳定标记的投影子树，允许 Target 保留调用方的 `defs` 或其他内容；同一 Target 不能同时绑定第二份活跃 SVG Renderer Instance。Factory 把投影根追加到 Target 末尾，不提供插入点配置也不重排调用方节点：创建时已有内容位于投影下方，之后由调用方追加的内容可位于投影上方。释放时只移除 Provider 拥有的子树、监听器和它自行添加的 Target 属性，不清空或移除 Target，从而同时保持可组合性与明确的 DOM 所有权。
