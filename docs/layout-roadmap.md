# NodeBraid Layout 范围记录

> 状态：首版已实现
>
> 日期：2026-08-19
>
> 本文记录首版与后续能力边界，不是详细接口手册。首版四个 Layout 包已按本基线实现；“后续单独设计与实现”中的能力仍未实现。

## 首版设计范围

已确认纳入首版设计：

- 整个 Canvas View 参与一次布局计算；不接受 Selection 或任意 Node 子集作为计算范围。
- Layout Engine 只返回候选 Node 位置，不直接修改 Kernel。
- Layout Input 是从已提交 Canvas View 生成的 Provider-neutral 规范化投影。
- Node 缺少 Size 时整体失败，不猜测默认尺寸。
- Layout Engine 使用统一异步接口并接收 `AbortSignal`。
- Layout Proposal 精确覆盖输入 Node，并绑定计算时的 Kernel revision；提交时 revision 不同则整体失败。
- 增量布局仍重新计算整张图，并把非固定 Node 的现有位置作为减少移动的软约束。
- 固定 Node 的原有绝对世界坐标是硬约束；它仍参与计算，且 Proposal 必须返回相同坐标。
- Edge 只投影 ID 与两端 Node ID，不投影 `type` 或不透明 `data`。
- 首版遇到 `parentId` 或 Endpoint `portId` 时显式失败，不扁平化嵌套图，也不将 Port 退化为 Node 中心。
- Layout Input 保留自环；不支持自环的 Provider 必须显式失败，不得静默删除。
- Layout Request 显式区分 full 与 incremental 模式；每个 Node 投影 `id`、`size`、`position` 与本次请求的 fixed 约束。
- Proposal 直接表达 Kernel Node 的绝对世界坐标，不引用 Viewport，Runtime 不自动居中。
- Kernel Node position 是 Node 边界左上角的绝对世界坐标；Provider Adapter 必须在进入 Proposal 前将自身坐标语义归一化到该锚点。
- Proposal 位置的数组顺序没有语义，Node ID 是唯一对应依据；实现可以按 ID 规范排序。
- 首版不建立 LayoutService Registry，也不设默认 Provider；每个 Provider 通过独立 typed Command 提供 Runtime 能力。
- full/incremental 模式与 Fixed Node 属于共享 Layout Request 约束；方向、间距和算法选项由各 Provider 定义强类型配置。
- Layout 层只为结构性失败定义稳定 LayoutError；Provider 的其他错误和 `AbortSignal` 取消原因保持原值。
- Provider 的稳定字符串 ID 只用于诊断；精确 Command token 是 Runtime 注册身份，同名 Command 由现有 Command Service 显式拒绝。
- Provider Command 的调用方只提供 mode、Fixed Node ID 与 Provider 配置；handler 在开始执行时读取当前 Canvas View 并捕获起点 revision。
- Provider Command 计算并直接提交，返回 `CanvasCommit | null`；首版不向调用方返回未提交 Proposal。
- 一份 Proposal 在一次同步 Transaction 中替换所有实际变化的 Node 位置，产生一个 Change Set 和一个 History Entry；`commandId` 使用 Provider Command 的诊断 ID。
- 所有首版 Provider 都必须支持 full 布局；至少一个官方 Provider 必须真正支持 incremental 与 Fixed Node。Provider 明确声明其他能力，不支持的请求在计算前失败。
- Layout Engine 以不可变 capability 显式声明 incremental、Fixed Node 与自环支持；full 是所有首版 Provider 的必备契约。
- 共享投影层验证 Layout Request、Fixed Node ID、Size、嵌套与 Port；Provider 验证配置及算法约束；Runtime 验证 Proposal 和提交时 revision。
- Layout Command 在输入投影前、Provider 调用前、Provider 返回后及 Transaction 前检查取消；同步 Transaction 开始后不可取消或倒销。
- 空图与全部 Node 固定的图仍调用 Provider 并要求完整 Proposal，不绕过配置、capability 或 Provider 契约验证；最终可产生 `null` Commit。
- `@nodebraid/plugin-layout` 是静态绑定一个 Layout Engine 与一个 typed Command 的 Runtime 集成工厂，不提供 LayoutService；Provider 包仍保持 Runtime-free。
- Layout Commit 使用 `origin: 'layout'`，并用 Provider Command 诊断 ID 区分具体算法。
- LayoutError 只稳定 `INVALID_REQUEST`、`INVALID_INPUT`、`UNSUPPORTED_FEATURE`、`INVALID_PROPOSAL` 与 `STALE_PROPOSAL` 五种 code；details 不复制完整图、Provider 配置或不透明 `data`。
- 并发 Layout Command 可以同时计算，但按 first-commit-wins 提交；不自动取消前一个任务，也不让后返回结果覆盖新 revision。
- Provider Command 要求调用方显式传入类型化配置对象，允许 `{}`；Provider 将公开、确定的默认值解析为完整且冻结的 effective config。
- 首版 Layout Engine 不拥有 `dispose()` 或独立资源生命周期；Command 注销负责取消并等待在途计算。
- 除自环 capability 外，所有 full Provider 必须支持空图、单 Node、断连分量、平行 Edge 和有向环。
- Layout Proposal 只包含起点 revision 与 Node positions，不复制 Provider ID、mode、effective config 或 capability。
- NodeBraid 复制并冻结 Layout Input、Capability 与验证后的 Proposal；Provider 负责冻结自己定义的 effective config。
- 同一 Provider 版本对相同规范化输入和 effective config 必须产生确定坐标；需要随机时必须使用显式 seed。
- Layout 接受 Kernel 合法的显式零宽或零高；它与缺少 Size 是不同语义。
- `@nodebraid/layout-api` 只依赖 `@nodebraid/kernel` 的 ID 与几何类型；Provider 只依赖 `layout-api`；`plugin-layout` 依赖 layout API、Kernel Plugin、Command Plugin 与 Plugin Host seam，内部包不依赖 `@nodebraid/core`。

## 首版包边界

首版设计包含四个发布包：

- `@nodebraid/layout-api`：公开 Layout Input、Layout Proposal、Layout Engine、capability、共享验证与结构错误。
- `@nodebraid/plugin-layout`：将一个 Engine 与一个 typed Command 静态绑定到 Runtime 提交链路。
- `@nodebraid/layout-dagre`：Dagre Layout Provider 与其类型化配置。
- `@nodebraid/layout-elk`：ELK Layout Provider 与其类型化配置。

Dagre 与 ELK 都必须真实验证 `layout-api` seam，两者都支持 full，且至少一个真正支持 incremental 与 Fixed Node。

`@nodebraid/core` 重导出 `layout-api` 与 `plugin-layout` 的通用能力，但不依赖或重导出 Dagre、ELK。高级消费者可以直接调用低层 Layout Engine 获得未提交 Proposal；官方 Runtime 写入路径仍是 `plugin-layout` Provider Command。

## 后续单独设计与实现

以下能力本次只保留路线记录，不进入首版契约：

- Layout Proposal 预览与人工接受、拒绝流程。
- Selection 或任意 Node 子集布局。
- 嵌套图布局，包括父 Node 尺寸、内边距、子 Node 相对坐标和自适应边界。
- Port-aware Layout，包括 Port 几何、顺序和连接约束。
- Edge Routing 及路径结果提交。
- Worker 执行与跨线程数据传输。
- Layout Input 或 Proposal 缓存。
- Layout Proposal、Provider 选择或计算中间状态的持久化。
- 动态 Layout Provider Registry、运行时 Provider 查询与默认 Provider 选择。
- Provider 选择 UI 与 Provider 配置持久化。
- stale Proposal 的自动重算、重试或重基。

## 设计结论

本次 design tree 的 frontier 已全部确认，当前没有未访问或默认接受的 Layout 设计分支。实现已通过本地 tickets 01–08 按 TDD 完成，Dagre 与 ELK 均使用真实依赖；ELK Stress 路径提供 incremental 与 Fixed Node，其他未证明的算法组合显式失败。
