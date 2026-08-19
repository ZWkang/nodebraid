---
status: accepted
---

# 保持 SVG Provider API 窄且同步

`@cflow/renderer-svg` 只导出同步具名 `createSvgRenderer` Factory、`SvgRendererConfig`、DOM 默认行为策略值类型，以及 `SvgRendererError` 与 code 类型。Config 只接受现有 `SVGSVGElement`、可选的非负有限 `edgeHitTolerance`，以及 pointer、wheel、keyboard、context menu 各自可选的 `preventDefault`/`stopPropagation` 策略。包不提供默认导出、Provider registry、Plugin 包装、插入点、任意 render callback 或异步 Factory；调用方在选择该 Provider 时显式依赖它，`@cflow/core` 不将具体 Provider 变成默认能力。
