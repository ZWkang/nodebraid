# CFlow

CFlow 是一个插件化、渲染器无关的流程画布框架。这里记录项目领域内的规范术语，不描述具体实现。

## Language

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
