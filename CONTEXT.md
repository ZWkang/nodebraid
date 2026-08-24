# NodeBraid

NodeBraid 是一个插件化、渲染器无关的流程画布框架。这里记录项目领域内的规范术语，不描述具体实现。

## Language

**Kernel**:
一个 Canvas Runtime 内拥有权威 Document、并维护渲染器无关图一致性的核心模块。
_Avoid_: Canvas Store, Global Graph, Renderer Model

**Document**:
一个 Kernel 内由 Node、Edge、Endpoint 和本地 revision 构成的权威图状态。
_Avoid_: Canvas Snapshot, Session State, Renderer Scene

**Node**:
Document 中可由 Edge 引用的图实体，其位置表示 Node 边界左上角的绝对世界坐标，并可包含尺寸、父子关系和不透明领域数据。
_Avoid_: Shape, Component, Renderer Node

**Edge**:
Document 中连接两个 Endpoint 的图实体。
_Avoid_: Renderer Line, Connection Object

**Endpoint**:
Edge 的一端，引用一个 Node，并可以带有由上层领域能力解释的 Port 标识。
_Avoid_: Port, Anchor Object, Renderer Handle

**Transaction**:
对 Document 的一次同步、原子更新尝试；只有最终图满足 Kernel 结构不变量时才会提交。
_Avoid_: Async Transaction, Mutation Session, Direct Write

**Canvas Snapshot**:
Document 在一个本地 revision 上的不可变读取表示，不等同于可持久化的 Serialized Document。
_Avoid_: Serialized Document, Mutable State, Renderer Snapshot

**Canvas Query**:
按实体与图关系读取状态的只读能力；Canvas View 中的 Query 绑定一个已提交 revision，Transaction 中的 Query 反映当前暂存状态。
_Avoid_: Live Query, Mutable Store, Document Handle

**Change Set**:
一次已提交 Transaction 在相邻 revision 之间产生的实体级 before/after 变化。
_Avoid_: Patch, Operation Log, Domain Event

**Canvas Runtime**:
一张活动画布的能力组合与生命周期范围。每个 Canvas Runtime 拥有彼此隔离的图状态、会话状态和插件环境。
_Avoid_: App Runtime, Global Runtime

**Plugin**:
安装到一个 Canvas Runtime、并在其安装生命周期内提供或使用能力的扩展定义。
_Avoid_: Cordis Plugin, Extension, Add-on

**Plugin Host**:
一个 Canvas Runtime 内承载和隔离 Plugin 的环境。
_Avoid_: Global Plugin Registry, Plugin Manager

**Plugin Installation**:
Plugin 与一份固定配置在一个 Plugin Host 中的一次安装，拥有独立且可显式结束的生命周期。
_Avoid_: Fiber, Fork, Plugin Instance

**Runtime Service**:
Plugin 在同一个 Plugin Host 内提供或使用的具名能力。
_Avoid_: Global Service, Dependency Object

**Service Token**:
Runtime Service 在一个 Plugin Host 内的强类型身份；诊断名称不是它的唯一性来源。
_Avoid_: Service Name, String Key, Cordis Service

**Pending Installation**:
已经存在于 Plugin Host、但因缺少 Required Service 而尚未激活的 Plugin Installation。
_Avoid_: Disabled Plugin, Failed Plugin

**Required Service**:
Plugin 激活并保持活动所必须存在的 Runtime Service。
_Avoid_: Optional Dependency, Nullable Service

**Service Provider**:
在一次 Plugin Installation 激活期间，为一个 Service Token 提供唯一 Runtime Service 值的角色。
_Avoid_: Global Provider, Service Factory

**Installation Status**:
Plugin Installation 对外可观察的粗粒度生命周期状态，只包括 pending、active、failed 与 disposed。
_Avoid_: Fiber State, Loading Phase

**Activation**:
Plugin Installation 的 Required Service 全部可用后，Plugin 建立并持有其 Runtime Service 与其他资源的一段活动周期。
_Avoid_: Startup, Mount, Fiber Run

**Owned Resource**:
在一次 Activation 中登记、并必须在该 Activation 结束时释放的资源。
_Avoid_: Global Resource, Unmanaged Effect

**Plugin Graph**:
一个 Plugin Host 内，由 Plugin Installation 及其 Required Service 与 Service Provider 关系形成的有向无环图。
_Avoid_: Load Order, Plugin List

**Canvas Composition**:
通过一组 Child Installation 组合出可用 Canvas Runtime 的 Plugin。
_Avoid_: Default Canvas, Hard-coded Runtime, Preset Class

**Basic Canvas Composition**:
NodeBraid 官方、渲染后端无关的基础 Canvas Composition，组合 Kernel、Command、Session、Renderer、Interaction 与 History，并由应用显式选择 Renderer Provider。
_Avoid_: Default Canvas, SVG Canvas, Basic Runtime Class

**Documentation Site**:
面向正在评估或采用 NodeBraid 的外部 TypeScript 开发者，介绍当前已交付的 Plugin、Runtime Service、Provider 与 package 组合关系的公开知识入口；不参与 Canvas Runtime 的能力发现或选择。
_Avoid_: Runtime Registry, Capability Registry, Architecture Roadmap

**Child Installation**:
由父 Plugin 的 Activation 安装并拥有、随父 Activation 结束而释放的 Plugin Installation。
_Avoid_: Nested Runtime, Detached Plugin

**Service Binding**:
Plugin 在 `requires` 或 `provides` 中为 Service Token 声明的局部名称。
_Avoid_: String Service Key, Dynamic Lookup

**Plugin Context**:
一次 Activation 中供 Plugin 使用 Required Service、登记 Owned Resource 和创建 Child Installation 的受限环境。
_Avoid_: Cordis Context, Global Context, Plugin Host

**Kernel Service**:
一次 Activation 内由 Kernel Plugin 提供的窄 Runtime Service，代表一份权威 Document 的读取、同步事务与已提交变化观察能力。
_Avoid_: CanvasKernel Service, Global Kernel, Mutable Document Service

**Commit Observer**:
订阅同一个 Kernel Service，并按本地 revision 顺序同步接收成功且有净变化的 Canvas Commit 的消费者。
_Avoid_: Transaction Observer, Draft Listener, Change Stream

**Session**:
一张活动 Canvas Runtime 中与 Document 分离的本地视图状态；首版只包含 Selection 与 Viewport，不进入 Document History、Persistence 或 Collaboration。
_Avoid_: Editor Store, UI Store, Document State

**Session Service**:
一次 Activation 内代表一份 Session 的窄 Runtime Service，不拥有 Document、Command、History 或 Renderer 能力。
_Avoid_: Global Session Store, Runtime State Bag, Editor Service

**Session Snapshot**:
Session 在一个观察时刻的不可变读取表示，由 Selection 与 Viewport 组成。
_Avoid_: Mutable Session State, Renderer Snapshot, Document Snapshot

**Selection**:
Session 中当前被选中的 Node 与 Edge 标识，不表达选择先后，重复标识属于同一成员，首版不区分主选项；外部设置只接受当前 Canvas View 中存在的标识，Document 变化后失效标识会按 Session 转换顺序协调移除。
_Avoid_: Renderer Selection, Preselection, Selected Objects

**Selection Snapshot**:
Selection 在一个观察时刻的不可变读取表示，Node 与 Edge 标识分别按规范 ID 顺序排列；该顺序只提供确定性观察，不承载选择语义。
_Avoid_: Ordered Selection, Primary Selection, Renderer Selection State

**Viewport**:
Session 中将世界坐标映射为逻辑屏幕坐标的平移与缩放状态；浏览器中的逻辑屏幕单位对应 CSS pixel，物理像素缩放属于 Renderer。
_Avoid_: Camera Object, Renderer Transform, Device-pixel Transform

**World Point**:
Viewport 变换前的绝对画布位置；Node position 表示其边界左上角的 World Point。
_Avoid_: Screen Point, Client Point, Device Point

**Screen Point**:
World Point 经 Viewport 变换后得到的 Renderer Target-local 逻辑屏幕位置；浏览器中以 Target 可视区域左上角为原点并使用 CSS pixel，而不是 SVG user unit 或设备物理像素。
_Avoid_: World Point, Device Point, Backing-store Point

**Renderer**:
将 Document 与 Session 的 Canvas 语义投影为可显示输出，并把后端输入标准化为 NodeBraid 值的角色；它不拥有 Document、Session 或 Command 写权。
_Avoid_: Drawing API, Scene Store, Canvas Controller

**Renderer Instance**:
Renderer Factory 为一个固定 Renderer Target 创建、并在终态释放前保持该绑定的一份 Renderer 生命周期实例。
_Avoid_: Remountable Renderer, Global Renderer, Shared Stage

**Renderer Provider**:
基于一种具体渲染后端实现 Renderer interface 的角色；各官方 Provider 彼此平级，NodeBraid 不指定默认实现。
_Avoid_: Default Renderer, Renderer Plugin, Backend Registry Entry

**SVG Renderer Provider**:
NodeBraid 用 SVG 投影通用 Canvas 语义的参考级官方 Renderer Provider；它不解释产品 Node type 或 data，也不是默认 Renderer。
_Avoid_: Default Renderer, Product Node Renderer, SVG Node System

**Renderer Factory**:
Renderer Provider 用类型化配置和可选后端目标创建一份新 Renderer 的入口。
_Avoid_: Renderer Registry, Global Renderer, Universal Mount

**Renderer Target**:
具体 Renderer Provider 投影输出所需的后端环境目标；它不是所有 Renderer 共享的 universal mount 类型。
_Avoid_: Canvas Container, Universal HTMLElement, Renderer Host

**SVG Renderer Target**:
由调用方拥有、并与一份 SVG Renderer Instance 绑定的现有 SVG 根元素；Provider 不创建或移除该 Target 本身。
_Avoid_: HTML Container, Provider-created SVG, Shared SVG Renderer Target

**Renderer Target Reservation**:
一份 Renderer Instance 从 Factory 接受 Target 到成功完成终态清理期间持有的排他绑定权；Reservation 未释放时不得为同一 Target 创建第二份实例。
_Avoid_: Target Lock, Global Renderer Slot, DOM Ownership

**SVG Projection**:
一份 SVG Renderer Instance 在 SVG Renderer Target 内拥有的通用 Canvas 语义表示；它不是权威 Document，也不包含调用方的产品节点标记。
_Avoid_: SVG Document, Product Scene, Authoritative Graph

**Port Geometry**:
一个 port-qualified Endpoint 可供 Renderer 解析的世界坐标连接位置；缺失时不得把 Node 中心猜测为该 Port 的位置。
_Avoid_: Node-center Fallback, Renderer Handle, Port ID

**Renderer Baseline**:
Renderer 最近一次完整重置或连续提交后已经接受的 Document 状态与本地 revision，是判断后续提交是否连续且内容一致的基线。
_Avoid_: Kernel Revision Source, Persistence Version, Collaboration Clock

**Renderer Document Update**:
Runtime 向 Renderer 交付的一次 Document 语义更新，只可能是完整重置或一个已提交变化，不是绘图指令或可写 Document 句柄。
_Avoid_: Draw Command, Document Patch, Renderer Mutation

**Renderer Input**:
Renderer 从后端输入标准化得到的 NodeBraid 交互事实，只包含 NodeBraid 值，不携带原生事件或后端目标对象。
_Avoid_: Native Event, DOM Event, Backend Event

**Pointer Input**:
Renderer Input 中描述一个 Pointer 的 down、move、up 或 cancel 转换及其逻辑坐标、按钮和修饰键事实的成员。
_Avoid_: Pointer Event, Mouse Event, Touch Event

**Active Pointer**:
一个 Renderer Instance 已接受 `pointer.down` 但尚未接受对应 `pointer.up` 或 `pointer.cancel` 的 Pointer；只有 Active Pointer 可以获得 Pointer Capture。
_Avoid_: Hover Pointer, Native Capture State, Drag Session

**Wheel Input**:
Renderer Input 中描述一个 Screen Point 上以逻辑屏幕像素规范化的二维滚轮增量及修饰键事实的成员。
_Avoid_: Wheel Event, Scroll Command, Native Delta

**Keyboard Input**:
Renderer Input 中描述 key down 或 key up、逻辑键值、物理键位、重复状态与修饰键事实的成员。
_Avoid_: Keyboard Event, Text Input, Shortcut Command

**Focus Input**:
Renderer Input 中描述 Renderer Focus 获得或丢失的逻辑转换，不携带原生焦点对象或后端事件。
_Avoid_: DOM Focus Event, Active Element, Keyboard Input

**Input Rejection**:
Interaction 因当前 Active Gesture 或 Pointer 所有权而明确不应用一条已规范化 Renderer Input 的结果；它可观察，但不是结构失败或 Gesture Cancellation。
_Avoid_: Ignored Input, Silent Fallback, Input Fault

**Renderer Input Subscription**:
按 Renderer 已标准化的输入顺序同步接收 Renderer Input 的可取消观察关系。
_Avoid_: Native Listener, Event Queue, Observable Stream

**Pointer Capture**:
Renderer 为一个仍然活跃的 Pointer 保持连续输入归属、直到 release、up 或 cancel 的 NodeBraid 交互控制状态。
_Avoid_: DOM Pointer Capture, Native Capture Handle, Drag State

**Renderer Focus**:
Renderer Target 接收 Keyboard Input 所需的逻辑输入焦点，不等同于暴露后端焦点对象。
_Avoid_: DOM Active Element, Native Focus Handle, Selection Focus

**Hit Result**:
Renderer 按当前已接受的投影 Geometry，对一个 Screen Point 报告的最上层 Canvas、Node、Edge、Port 或 Connection Anchor 语义目标及其 World Point；Target 外没有 Hit Result，调用方的后端 DOM 或样式不会改变该语义结果。
_Avoid_: Native Target, Event Target, Renderer Object

**Renderer Runtime Plugin**:
把一个 Renderer Factory 与 Kernel、Session 组合起来，拥有 Renderer Instance、状态同步、输入转发和 Activation 清理的 Runtime adapter。
_Avoid_: Renderer Provider, Canvas Renderer, Preset

**Renderer Service**:
Renderer Runtime Plugin 向 Interaction 提供的窄 Runtime Service，只暴露输入观察、命中与 NodeBraid-owned 输入控制，不暴露渲染状态更新或释放权。
_Avoid_: Canvas Renderer Service, Renderer Host, Mutable Renderer

**Interaction**:
解释 Renderer Input 与 Hit Result，并据此更新 Session 或执行 Command 的画布行为能力。
_Avoid_: Renderer Behavior, Native Event Handler, Direct Document Mutation

**Connection Anchor**:
附着于一个 Node、并以 source 或 target role 参与 Edge Connection 的 Renderer 语义命中目标；它不是 Document 实体，首版也不表达 Port 身份。
_Avoid_: Port, Endpoint, Renderer Handle, Anchor Object

**Connection Gesture**:
从 source Connection Anchor 开始、以瞬态 Connection Preview 评估 target Connection Anchor，并以提交一条 Edge 或取消结束的 Active Gesture。
_Avoid_: Edge, Connection Object, Renderer Drag

**Active Gesture**:
Interaction 当前正在解释的一段连续行为；它由一个 Gesture Pointer 驱动，并在提交稳定结果或取消时结束。
_Avoid_: Active Pointer, Drag Session, Primary Gesture

**Gesture Pointer**:
驱动当前 Active Gesture 的 Active Pointer；同一 Interaction Activation 同时最多只有一个。
_Avoid_: Primary Pointer, Selected Pointer, Captured Pointer

**Gesture Preview**:
Active Gesture 期间由 Interaction 拥有的瞬态候选视图状态，不是 Document 或 Session 的稳定状态。
_Avoid_: Session State, Document Draft, Renderer State

**Connection Preview**:
Connection Gesture 期间表达 source Connection Anchor、当前 Pointer 与可选 target Connection Anchor 有效性的 Gesture Preview；它不是未提交的 Edge。
_Avoid_: Draft Edge, Preview Edge Entity, Renderer Line

**Interaction Projection**:
Interaction 为显示 Gesture Preview 产生的不可变、渲染后端无关语义表示；Renderer 可以持有可重建投影，但不因此拥有 Active Gesture。
_Avoid_: Renderer Snapshot, DOM Overlay, Mutable Gesture State

**Interaction Projection Binding**:
一份 Renderer Activation 内排他替换或清除 Interaction Projection 的有界写权；同一 Renderer 同时最多只有一份。
_Avoid_: Projection Registry, Renderer Handle, Shared Preview Channel

**Projection Baseline**:
Interaction Projection 所依赖的最小稳定状态证据；Node Drag 使用每个 Node 的起点 position，Viewport Pan 使用起点 Viewport，Connection Preview 只依赖其 source 与可选 target Connection Anchor 所属 Node 的存在性，三者都不把无关的全局 revision 当作有效性条件。
_Avoid_: Source Revision, Renderer Baseline, Full Session Snapshot

**Effective Renderer State**:
Renderer 当前已接受的 Document、Session 与最新 Interaction Projection 合成的语义状态，用于显示、命中与输入坐标转换。
_Avoid_: Renderer Snapshot, Document State, Gesture State

**Renderer Sync Failure**:
Renderer Runtime 在一次状态同步失败及其唯一完整恢复也失败后进入的终态；该 Activation 不再发布 Input 或接受交互控制。
_Avoid_: Temporary Renderer Error, Retry State, Interaction Cancellation

**Additive Modifier**:
Interaction 中表示成员资格切换的输入修饰语义；Shift、Meta 或 Control 任一按下时成立，Alt 不属于该语义。
_Avoid_: Platform Command Key, Range Selection Modifier, Alt Modifier

**Node Drag**:
为一个或多个已选 Node 产生绝对候选 World position，并以稳定 Document 结果或取消结束的 Active Gesture。
_Avoid_: Node Transaction, Renderer Drag, Position Stream

**Viewport Pan**:
根据 Gesture Pointer 的 Screen Point 位移产生候选 Viewport，并以稳定 Session 结果或取消结束的 Active Gesture。
_Avoid_: Canvas Drag, Renderer Translation, Document Pan

**Stale Gesture**:
起点的 Document 或 Session 证据已不再与当前稳定状态一致、因而其 Gesture Preview 不能作为当前结果接受的 Active Gesture。
_Avoid_: Old Pointer, Stale Renderer, Rebased Gesture

**Move Nodes Command**:
仅在每个目标 Node 的当前 position 与声明起点一致时，原子提交所有绝对目标 position 的强类型 Command。
_Avoid_: Move Delta, Drag Commit, Position Patch

**Create Edge Command**:
仅在完整 Edge 与 source、target Connection Anchor 证据一致，且所需 Node 与 Edge ID 仍可用时，原子提交该 Edge 的强类型 Command。
_Avoid_: Edge Factory, Direct Edge Write, Connection Commit

**Layout Engine**:
根据已提交的画布图计算候选布局、但不修改 Document 的能力。
_Avoid_: Layout Writer, Auto-layout Transaction, Graph Mutator

**Layout Request**:
一次布局计算意图，将全量或增量模式、固定 Node 约束与某个 Layout Provider 的类型化配置组合起来。
_Avoid_: Layout Command, Layout Transaction, Layout Job

**Layout Input**:
从一个已提交 Canvas View 规范化得到的不可变、Provider-neutral 布局图投影。
_Avoid_: Canvas View, Layout Snapshot, Kernel Query

**Layout Proposal**:
一次 Layout Engine 基于一个已提交 revision 产生的、精确覆盖输入 Node 的候选位置集合；它不是已提交变化，也不表达 Edge Routing、Node Size 或任意实体补丁。
_Avoid_: Layout Patch, Change Set, Positioned Document

**Layout Provider**:
基于一种具体布局算法或引擎实现 Layout Engine 的角色。
_Avoid_: Layout Plugin, Default Layout, Algorithm Registry Entry

**Layout Capability**:
Layout Provider 对 incremental、Fixed Node 或自环等可选布局语义的显式支持声明。
_Avoid_: Provider Registry, Silent Fallback, Feature Guess

**Incremental Layout**:
对整张布局图重新计算，同时将非固定 Node 的现有位置视为尽量减少移动的软约束。
_Avoid_: Partial Layout, New-node-only Layout, Cached Layout

**Fixed Node**:
在布局计算中必须保持原有绝对世界坐标的 Node；它仍参与布局约束并出现在 Layout Proposal 中。
_Avoid_: Pinned Node, Anchor Node, Excluded Node

**Command**:
安装到一个 Canvas Runtime、由强类型身份标识并可执行同步或异步准备工作的行为定义；它通过所属 Plugin 已声明的 Runtime Service 提交最终状态变化。
_Avoid_: Action, Event Handler, Kernel Operation

**Command Service**:
一次 Activation 内负责注册、查找、执行和释放 Command 的 Runtime Service，不拥有 Kernel、Session 或其他状态能力。
_Avoid_: Global Command Registry, Command Bus, Action Store

**History**:
一次 Activation 内按提交顺序保留可撤销与可重做 Document 变化的画布能力。
_Avoid_: Command Log, Document Backup, Persistent Timeline

**History Entry**:
由一个 Recordable Commit 的 Change Set 形成的可逆 Document 变化单元；其中的领域 `data` 继承 Kernel 的不可变值约定。
_Avoid_: Command Entry, Snapshot Copy, Undo Action

**Recordable Commit**:
History 应当建立 History Entry 的 Canvas Commit；包括当前 Activation 观察到的所有非 Replay Commit。
_Avoid_: User Commit, Command Commit, Ordinary Commit

**Replay Commit**:
History 为撤销或重做 History Entry 而产生的新 Canvas Commit，其 revision 继续单调递增。
_Avoid_: Restored Commit, Reverted Revision, Rollback Commit

**History Snapshot**:
History 在当前状态下是否可撤销、可重做的稳定不可变读取表示。
_Avoid_: History Stack, Entry List, Mutable History State

**History Service**:
一次 Activation 内提供 History Snapshot 稳定读取与变化订阅的窄 Runtime Service，不另行提供撤销或重做行为入口。
_Avoid_: Undo Manager, History Controller, History Command Bus

**History Baseline**:
一次 History Activation 开始记录时的 Kernel revision；更早的 Canvas Commit 不形成该 Activation 的 History Entry。
_Avoid_: Initial Snapshot, Restored History, Revision Zero
