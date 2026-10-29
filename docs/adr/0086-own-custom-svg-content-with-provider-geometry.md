---
status: accepted
---

# 由 SVG Provider 拥有自定义内容与节点 Geometry

SVG Factory 可静态接收同步 `createNodeContent`，应用解释 Node 的 type 与 opaque data，
构造一份新、未挂载、以 Node 左上角为原点的 SVG 内容。Provider 接收后拥有该子树，
并继续管理稳定外层、position、size 语义、Selection、Viewport、Port/Anchor 与矩形命中。
自定义圆形外观不改变其矩形角落的可命中性；不自动裁剪或修正外溢。

这扩展 ADR-0050 的样式 seam。未配置内容函数时保留原矩形 DOM；配置时只承诺连续
Commit 中 Node 外层 identity，内部内容可以替换。reset 重建全部内容；普通 Commit
只在新增或 type、size 数值、data identity 改变时构造内容，位置、拖动和 Session 更新
不触发重建。不引入 SVG 描述语言、动态类型注册或组件 mount/dispose 生命周期。

内容构造属于 ADR-0054 的预检。所有候选均成功后才改变 live DOM；深层替换记录原
子树以便回滚，原始异常和回滚失败继续显式暴露。应用任意外部副作用不在 Renderer
回滚能力内。Renderer all-or-throw 保护自身状态，不撤销已经提交的 Kernel/History；
Runtime 同步失败沿既有恢复与终态失步契约处理。

reset 的统一重建规则也适用于 Runtime 独立注册或释放 Port Contribution 时发送的同 revision reset。普通增量中的 Port Geometry 变化不重建内容；不新增独立 Port 更新协议。真实 Runtime 与 SVG 组合测试必须区分这两条路径。
