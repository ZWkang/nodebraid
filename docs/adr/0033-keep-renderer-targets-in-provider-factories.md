---
status: accepted
---

# 将 Renderer Target 留在 Provider Factory

`CanvasRenderer` 不定义接受 `HTMLElement` 或其他 universal target 的 `mount` interface；具体 Renderer Provider 通过自己的类型化 Factory 配置接收所需 Target 并创建 Renderer，Headless Provider 则可以没有 Target。这样浏览器 DOM、SVG 容器、离屏表面或其他后端环境只存在于选择它们的 Provider package，`@cflow/renderer-api` 不会把 web-first 假设伪装成跨后端契约，也不需要以 `unknown`、联合类型或逃生句柄扩大公共 interface。
