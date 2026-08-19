---
status: accepted
---

# 分离 SVG Provider 与通用 Renderer 错误

`@cflow/renderer-svg` 导出 domain 为 `renderer.svg` 的 `SvgRendererError`，用 `INVALID_CONFIG`、`INVALID_TARGET`、`TARGET_OCCUPIED` 与 `TARGET_UNAVAILABLE` 表达 Provider-specific Factory 和 SVG Target 失败，而不把 DOM 概念扩散到 `@cflow/renderer-api`。Document、Session、Screen Point、Pointer 和已释放实例继续使用公共 `RendererError` code，具体失败类别使用安全 details 中的 `issue` 区分。未知 DOM 或浏览器异常保持原始身份，不包装成已知错误或伪造成功。
