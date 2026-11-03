---
status: accepted
---

# 用应用投影值与共享几何表达可读连线

SVG Provider 通过显式 `edges` 配置接受应用同步返回的路径与纯文本标签，拥有正交/贝塞尔路径、方向箭头、确定性平行分道和语义命中；Kernel 保留不透明 data，编辑与 codec 仍由应用拥有。配置缺省保持原直线 DOM 与命中规则；新模式使用稳定 Edge 外层、共享绘制/命中/拖动几何，并以最近路径或箭头距离命中，等距保持既有顺序，文字仅作为显示内容。

这扩展 ADR-0048、ADR-0050 与 ADR-0053，保留其默认模式兼容性与无图写权边界；同组端点身份包含 Port ID，增删 Edge 可以重排派生路径，但不会写 Document 或 History。应用表示在 Document 更新时捕获，并与 DOM、Baseline 和几何一起原子接受；Session、Viewport 和候选拖动不重新解释应用数据。Connection Preview 尚无 Edge，使用显式 `previewPath`，不提前调用 materializer；自环继续明确拒绝，不增加全图避障或产品编辑 UI。
