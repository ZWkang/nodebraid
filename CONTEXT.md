# CFlow

CFlow 是一个插件化、渲染器无关的流程画布框架。这里记录项目领域内的规范术语，不描述具体实现。

## Language

**Kernel**:
一个 Canvas Runtime 内拥有权威 Document、并维护渲染器无关图一致性的核心模块。
_Avoid_: Canvas Store, Global Graph, Renderer Model

**Document**:
一个 Kernel 内由 Node、Edge、Endpoint 和本地 revision 构成的权威图状态。
_Avoid_: Canvas Snapshot, Session State, Renderer Scene

**Node**:
Document 中可由 Edge 引用的图实体，包含跨渲染器成立的位置、可选尺寸、父子关系和不透明领域数据。
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

**Command**:
安装到一个 Canvas Runtime、由强类型身份标识并可执行同步或异步准备工作的行为定义；它通过所属 Plugin 已声明的 Runtime Service 提交最终状态变化。
_Avoid_: Action, Event Handler, Kernel Operation

**Command Service**:
一次 Activation 内负责注册、查找、执行和释放 Command 的 Runtime Service，不拥有 Kernel、Session 或其他状态能力。
_Avoid_: Global Command Registry, Command Bus, Action Store
