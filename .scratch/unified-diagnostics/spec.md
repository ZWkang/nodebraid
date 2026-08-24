# NodeBraid Unified Diagnostics and Error Handling

**Status:** ready-for-agent

## Problem Statement

NodeBraid 当前没有生产日志 Module。生产代码唯一的未捕获错误出口，是 Runtime、Kernel Plugin、Session Plugin 与 History Plugin 中四份重复的 `globalThis.reportError` / `queueMicrotask throw` 实现。它们只传递原始 `unknown`，不携带 Host、Installation、Activation、Plugin、Command 或 revision 上下文。

仓库同时公开七个领域 Error 类。它们大多采用 `Error + code + details`，但没有共同基类、全局身份、统一只读规则、安全描述或稳定序列化。相同的 `SERVICE_DISPOSED` 出现在多个包中；cleanup 聚合有时递归拍平、有时保留树；部分 details 还包含 Service Token、函数或任意无效输入。

“统一日志”不能变成全局 console wrapper，“统一错误”也不能把 Plugin Setup、Command Handler、Transaction Callback 与 Abort reason 全部包成一个新 Error。现有公开行为要求这些外部失败保持原对象，Observer/Subscriber Fault 不得回滚已提交状态或阻塞其他监听者，并且没有 Reporter 时必须显式暴露。

本设计的首要目标是 Agent Friendly：Agent 应当能通过稳定的事件名、`domain/code`、Host 内序号和固定上下文字段定位一个失败，不需要解析自然语言 message、猜测输出格式或在多个包中寻找不同的 error helper。

## Agent-Friendly Success Criteria

1. 一个事件名或错误身份可以在仓库中精确搜索到唯一声明和有限的发射位置。
2. NodeBraid 结构性错误都能用 `instanceof NodeBraidError`、`domain` 与 `code` 判断，不解析 `message`。
3. 同一失败只在拥有并处置它的语义 seam 产生一次 Error-level Diagnostic Event。
4. 每个 Runtime 事件都带 `hostId`、Host 内 `sequence`，在适用时带 Installation、Activation 与 Plugin scope。
5. NodeBraid details、event attributes 和错误描述可以确定性地转成 JSON，不执行任意 `toJSON`，不遍历业务对象。
6. 原始外部错误、Abort reason 和 Plugin failed snapshot 的对象身份保持不变。
7. Sink、Fault Reporter 与 Subscriber 自身失败不会递归或改变 Document、Session、History、Command 和 Plugin 生命周期结果。
8. 测试通过公开 Interface 观察，不需要访问私有 logger、Cordis Context、内部队列或序号器。

## Solution

新增零运行时依赖、无副作用的 deep module `@nodebraid/diagnostics`。它在整个 workspace 的依赖图底部，集中实现：

- NodeBraid 结构性错误的共同基类与安全 details；
- 不可变 Diagnostic Event、Diagnostic Sink 和 Fault Reporter 契约；
- 确定性的错误因果树描述；
- 事件值校验、复制、冻结与 Sink/Reporter 隔离。

`@nodebraid/runtime-cordis` 在 `createPluginHost()` seam 接受每 Host 的 diagnostics 配置，并通过 `PluginContext.diagnostics` 向 Plugin 暴露只有两个操作的窄 Interface：产生普通事件、上报无法返回给调用者的 Fault。Host 的 Implementation 负责补全 scope、时间、序号和事件 ID。

```text
Pure Module Failure ──throw/reject──────────────────────▶ Caller

Runtime-owned Failure ──Diagnostic Event───────────────▶ Sink
                     └─原有 throw/reject/failed state──▶ Caller

Contained Callback Fault ──Diagnostic Event────────────▶ Sink
                         └─Fault Report─────────────────▶ Fault Reporter
```

Diagnostic Sink 是 observation adapter，不是错误处理器。一次 Sink 写入成功不能消费 Fault，也不能改变原有 throw、reject、failed snapshot 或 cleanup rejection。

## Public Interface

以下类型草图固定语义和最小 surface；实现时可以调整泛型写法，但不得扩大职责。

```ts
export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

export type DiagnosticValue =
  null | boolean | number | string | readonly DiagnosticValue[] | Readonly<{ [key: string]: DiagnosticValue }>;

export type DiagnosticAttributes = Readonly<Record<string, DiagnosticValue>>;

export function describeNonFiniteNumber(value: number): 'nan' | 'positive-infinity' | 'negative-infinity';

export interface DiagnosticScope {
  readonly hostId: string;
  readonly installationId?: string;
  readonly activationId?: string;
  readonly pluginName?: string;
}

export interface DiagnosticEvent {
  readonly version: 1;
  readonly id: string;
  readonly sequence: number;
  readonly timestamp: number;
  readonly name: string;
  readonly level: DiagnosticLevel;
  readonly scope: DiagnosticScope;
  readonly attributes: DiagnosticAttributes;
  readonly error?: unknown;
}

export interface DiagnosticEventInput {
  readonly name: string;
  readonly level: DiagnosticLevel;
  readonly attributes?: DiagnosticAttributes;
  readonly error?: unknown;
}

export interface DiagnosticFault {
  readonly event: DiagnosticEvent;
  readonly error: unknown;
}

export type DiagnosticSink = (event: DiagnosticEvent) => void;
export type FaultReporter = (fault: DiagnosticFault) => void;

export interface PluginDiagnostics {
  emit(input: DiagnosticEventInput): void;
  reportFault(error: unknown, input: Omit<DiagnosticEventInput, 'level' | 'error'>): void;
}

export interface PluginHostDiagnosticsOptions {
  readonly hostId?: string;
  readonly sink?: DiagnosticSink;
  readonly faultReporter?: FaultReporter;
}

export interface PluginHostOptions {
  readonly diagnostics?: PluginHostDiagnosticsOptions;
}

export function createPluginHost(options?: PluginHostOptions): PluginHost;
```

`PluginContext` 新增只读 `diagnostics: PluginDiagnostics`。Plugin 不能设置或覆盖 scope、sequence、timestamp、event ID 与 Fault level；`reportFault()` 强制生成 `error` 级别事件。

`createPluginHost()` 保持无参数兼容。未配置 Sink 明确表示普通 Diagnostic Event disabled，不回退到 console。未配置 Fault Reporter 时使用平台 `globalThis.reportError(fault.error)`；平台不可用时通过 `queueMicrotask` 显式抛出原错误。

## Structural Error Interface

```ts
export abstract class NodeBraidError<
  Domain extends string,
  Code extends string,
  Details extends DiagnosticAttributes = DiagnosticAttributes,
> extends Error {
  readonly domain: Domain;
  readonly code: Code;
  readonly details: Details;
  override readonly cause?: unknown;
}
```

每个领域 Error 保留当前公开类和前三个构造参数，并可以追加可选 `cause`：

```ts
new KernelError(code, message, details?, { cause? });
```

基类将 details 复制为规范键顺序、校验所有 number 有限、递归冻结，并拒绝 `undefined`、BigInt、Symbol、函数、类实例、循环引用与非字符串键。默认 details 是共享的只读空记录。非法 details 是构造者违反 Interface，必须同步抛出带精确属性路径的 `TypeError`，不能静默删除或字符串化。

固定 domain：

| Error class         | domain                |
| ------------------- | --------------------- |
| `DiagnosticsError`  | `diagnostics`         |
| `KernelError`       | `kernel`              |
| `LayoutError`       | `layout`              |
| `PluginHostError`   | `runtime.plugin-host` |
| `KernelPluginError` | `plugin.kernel`       |
| `CommandError`      | `plugin.command`      |
| `SessionError`      | `plugin.session`      |
| `HistoryError`      | `plugin.history`      |

首版 `DiagnosticsErrorCode` 固定为 `INVALID_EVENT`、`INVALID_DIAGNOSTIC_VALUE`、`ASYNC_SINK` 与 `ASYNC_FAULT_REPORTER`。普通 `emit()` 输入违反事件名、级别或 attributes 契约时同步抛出前两类结构性错误；`reportFault()` 输入无效时不能用该结构性错误替换原 Fault，而是把两者一起送入最终 Reporter。

`domain + '/' + code` 是全局协议身份。`Error.name` 只表达具体 JavaScript 类。severity、retryable、HTTP status、用户文案和恢复策略不进入 Error。

Plugin Setup、Command Handler、Transaction Callback、Layout Provider 原始失败和 Abort reason 不转换为 NodeBraidError。单一下游失败只有在 NodeBraid 本来就必须建立新的结构性错误时才放入 `cause`；不能只为增加上下文而包装。

多个并列 cleanup failure 使用原生 `AggregateError.errors`。每一层 AggregateError 保留自己的 message 和阶段，删除递归拍平行为。多个错误是 siblings，单一原因是 cause，二者不能互相替代。

## Error Description

`@nodebraid/diagnostics` 导出 `describeError(error: unknown): DiagnosticErrorDescription`。返回值只包含 DiagnosticValue，可以直接 JSON 序列化，并按以下 discriminant 保留结构：

- `kind: 'nodebraid'`：name、message、stack、domain、code、details、可选 cause；
- `kind: 'aggregate'`：name、message、stack、errors、可选 cause；
- `kind: 'error'`：name、message、stack、可选 cause；
- `kind: 'unknown'`：原始值的安全类型和有限表示；
- `kind: 'circular'`：指回已经访问过的因果节点路径。

该函数不得调用任意 Error 的 `toJSON`，不得展开非 NodeBraid Error 的自定义属性，也不得把普通对象当业务数据递归遍历。它保留 stack 字符串供本地诊断；网络 Adapter 是否移除或重写 stack 由宿主决定。因果树使用引用检测，不设置静默深度或数量上限。

`describeDiagnosticEvent(event)` 将原始 `error` 替换为上述描述，其余 envelope 保持不变，供 console/Sentry/OpenTelemetry Adapter 使用。该函数返回数据而不执行 I/O。

## Event Identity and Ordering

- Event `version` 首版固定为 `1`。
- 自动生成的 Host ID 使用 `nodebraid.host.<process-counter>`；宿主可以显式提供非空 `hostId` 以对齐自己的 Runtime 身份。
- Installation 与 Activation 使用 Host-local 单调 ID，例如 `<hostId>.installation.3`。
- `sequence` 从 1 开始，在一个 Host 内对所有 Diagnostic Event 单调递增。
- `id` 固定为 `<hostId>.event.<sequence>`。
- `timestamp` 是事件被 Host 接受时的 Unix epoch milliseconds。
- sequence 是确定顺序；timestamp 只用于跨系统对齐，不用来推断同一 Host 的先后。
- Plugin name 是诊断 metadata，不替代 Plugin、Service Token 或 Installation 的运行时身份。

事件 envelope、scope 和 attributes 在交给 Sink 前已经复制并递归冻结。Sink 不能通过修改输入影响后续状态或其他事件。

## Initial Event Catalog

事件名是低基数稳定协议。每个 emitting package 在单独的 `diagnostic-events.ts` 中声明自己拥有的常量；禁止在 throw/catch site 内散落字符串。

| Event name                                        | Owner          | Level       | Meaning                                                                      |
| ------------------------------------------------- | -------------- | ----------- | ---------------------------------------------------------------------------- |
| `nodebraid.runtime.host.created`                  | runtime-cordis | info        | Host 已创建，scope 只有 hostId                                               |
| `nodebraid.runtime.host.disposing`                | runtime-cordis | debug       | Host 开始终止，不代表成功                                                    |
| `nodebraid.runtime.host.disposed`                 | runtime-cordis | info        | Host 全部清理成功结束                                                        |
| `nodebraid.runtime.installation.status.changed`   | runtime-cordis | debug/error | Snapshot 已替换、subscriber 尚未通知；进入 failed 时为 error 并携带原始错误  |
| `nodebraid.runtime.installation.dispose.failed`   | runtime-cordis | error       | Installation 已结束但 cleanup rejection 将返回调用者                         |
| `nodebraid.runtime.activation.started`            | runtime-cordis | debug       | 一次新的 Activation 开始 setup                                               |
| `nodebraid.runtime.activation.ended`              | runtime-cordis | debug       | Activation 完成 cleanup，attributes 包含结束原因                             |
| `nodebraid.runtime.installation.subscriber.fault` | runtime-cordis | error       | Installation subscriber 抛错；同时进入 Fault Reporter                        |
| `nodebraid.plugin.kernel.observer.fault`          | plugin-kernel  | error       | Commit Observer 抛错；同时进入 Fault Reporter                                |
| `nodebraid.plugin.session.subscriber.fault`       | plugin-session | error       | Session subscriber 抛错；同时进入 Fault Reporter                             |
| `nodebraid.plugin.history.subscriber.fault`       | plugin-history | error       | History subscriber 抛错；同时进入 Fault Reporter                             |
| `nodebraid.diagnostics.sink.fault`                | diagnostics    | error       | Sink 自身失败；只交给 Fault Reporter，不递归交给 Sink                        |
| `nodebraid.diagnostics.fault-reporting.fault`     | diagnostics    | error       | `reportFault()` 输入无效；只向最终 Reporter 保留原 Fault 与 contract failure |

`status.changed` attributes 固定使用 `from`、`to`、`missingServiceNames` 和 `phase` 中适用的字段。Service Token 必须先转成稳定 diagnostic name，不能进入 attributes。Activation ended reason 固定为 `dependency-lost`、`installation-disposed`、`setup-failed` 或 `setup-completed`，不接受自由文本。

首版不记录每次 Transaction、Command execute、pointer event、Layout position、Selection 内容或成功的业务操作。它们属于高频 tracing、产品 audit 或业务 telemetry，需要真实消费需求后再建立独立设计，不能偷偷扩张本事件目录。

## Failure Ownership and De-duplication

只在以下语义 seam 产生 Error-level Event：

- 一个原始错误被转成 failed Installation Snapshot；
- cleanup 已结束且其 rejection 将从公开 dispose 返回；
- 一个外部 listener Fault 被隔离，无法通过原调用返回；
- Diagnostic Sink 自身失败。

Error constructor、普通 throw、catch/rethrow、Command Handler rejection、Transaction Callback failure 与调用者可直接获得的 Provider failure 不记录。Host 聚合多个已经分别记录的 Installation cleanup failure 时不再逐项重记；如未来需要 Host summary，只能引用既有 event IDs，不能复制原错误。

一个 failed Snapshot 的事件必须在 Snapshot 字段替换后、subscriber 通知前同步交给 Sink。这样 Sink 和 subscriber 读取到的是同一状态；Sink failure 通过 Fault Reporter 隔离后仍继续通知 subscriber。

## Sink and Fault Reporter Semantics

Diagnostic Sink 与 Fault Reporter 都是同步 Interface。异步 Adapter 必须在自己的 Implementation 中排队；NodeBraid 不等待上传、批量或持久化。

- Sink 抛错：原操作继续，使用 `nodebraid.diagnostics.sink.fault` 直接调用 Fault Reporter，不重新调用 Sink。
- Sink 返回 PromiseLike：视为违反同步 Interface，通过 Fault Reporter 显式报告 `diagnostics/ASYNC_SINK`；不得留下未观察 rejection。
- Fault Reporter 成功返回：Fault 已交给宿主，但不改变任何原始 Runtime 状态或返回值。
- Fault Reporter 抛错：通过一次 `queueMicrotask` 抛出 `AggregateError([originalFault, reporterError])`，不再次调用 Sink 或 Reporter。
- Fault Reporter 返回 PromiseLike：显式异步抛出 `diagnostics/ASYNC_FAULT_REPORTER`，并观察其 settlement，避免 unhandled rejection 形成第二条不可控路径。
- `reportFault()` 的 event input 无效时：最终上报同时保留原 Fault 和 diagnostics contract failure，不能用校验错误替换原 Fault。

## Safe Attributes and Privacy

DiagnosticValue 只允许 finite number、string、boolean、null、array 和 string-key record。内置事件 attributes 只携带状态、阶段、计数、revision、Command diagnostic ID 与 NodeBraid 自己生成的 scope ID。

禁止自动放入：

- Node/Edge `data`、完整 Document、Change Set 或 Layout Input/Proposal；
- Plugin 配置、Runtime Service 值、Service Token 对象；
- Command 输入输出、Selection 实体列表、用户内容；
- arbitrary Error 自定义属性；
- authorization、token、header、cookie、环境变量。

NodeBraidError throw site 必须把非法输入转成安全分类，例如 `receivedType`、`field`、`index`、`issue`，不能把原始函数或对象塞进 details。原始外部 Error 只在 in-process event 的 `error` 字段保持身份；Adapter 使用 `describeError` 得到安全、有限结构。

非有限数字使用 `receivedNumber: 'nan' | 'positive-infinity' | 'negative-infinity'` 表达，负零规范化为零；Service Token 使用公开 diagnostic name 字符串表达。不存在通用的“把任意对象变安全”fallback，每个结构性 Error throw site 必须显式选择它拥有的字段。

## Package and Dependency Decisions

- 新增 `packages/diagnostics`，package name 为 `@nodebraid/diagnostics`。
- package 标记 `sideEffects: false`。
- diagnostics 不依赖 Kernel、Runtime、Cordis、RxJS、Renderer、core 或外部 logger。
- `@nodebraid/kernel`、`@nodebraid/layout-api`、`@nodebraid/runtime-cordis` 和所有 Runtime Plugin 直接依赖 diagnostics。
- 具体 Layout Provider 继续通过 LayoutError 间接获得共同错误契约，不额外依赖 Runtime。
- `@nodebraid/core` 重导出 diagnostics 的公开 Interface，不拥有实现。
- 内部包不得依赖 core；diagnostics 声明不得引用任何上层 workspace package。
- workspace build/typecheck dependency scripts必须先生成 diagnostics declarations，再构建依赖它的包。

## Compatibility Decisions

- `createPluginHost()` 无参数调用继续成立。
- 各领域 Error 类、Error code 和前三个构造参数继续公开。
- Error details 中原来携带任意值或 Service Token 的位置改为安全字段；这是为稳定机器协议接受的 0.0.x breaking refinement。
- Plugin Setup、Command Handler、Transaction Callback、Provider failure 与 Abort reason 身份保持不变。
- failed Installation Snapshot 继续保存原始 `unknown` error。
- Observer/Subscriber Fault 继续不回滚状态、不阻塞后续 listener；默认平台上报行为保持。
- cleanup AggregateError 改为保留因果树；依赖递归拍平的内部测试与 helper 必须迁移。

## Testing Decisions

- diagnostics package 的公开 Interface 是 NodeBraidError、DiagnosticValue normalization、`describeError` 与描述后的事件；直接测试结果，不测试私有遍历器。
- Runtime 行为测试使用真实 `createPluginHost()`、真实 Plugin 与 in-memory Sink/Fault Reporter adapter。
- 同一个测试同时证明事件内容、事件顺序和原有 Runtime 结果，避免另建只测 logger mock call 的浅测试层。
- 使用两个 Host 证明 ID、sequence、Sink 和 Reporter 隔离。
- 证明事件 sequence 单调、event ID 可推导、Snapshot 已更新后才发事件、subscriber fault 不阻塞后续 subscriber。
- 证明没有 Sink 时普通事件不输出，Fault 仍走平台 Reporter。
- 证明 Sink throw、async Sink、Reporter throw、async Reporter 均显式暴露且不递归。
- 证明所有领域 Error 都是 NodeBraidError、domain/code 固定、details 深冻结且 JSON-safe。
- 证明非法 details 报告精确路径，NaN、Infinity、function、token、class instance 和 cycle 不被静默转换。
- 证明 `describeError` 保留 NodeBraid cause、AggregateError tree、普通 Error、unknown primitive 和 circular reference。
- 证明 Plugin Setup、Command Handler、Transaction Callback、Provider failure 和 Abort reason 是原对象。
- 证明 nested cleanup AggregateError 不被拍平，所有 disposer 仍继续执行。
- 对每个内置 event name 建立唯一性与固定 level 测试；源码检查禁止重新出现 package-local `globalThis.reportError` helper。
- 声明检查禁止 diagnostics 泄漏上层包、Runtime 声明泄漏 Cordis，以及 core facade 遗漏重导出。
- 完成 workspace typecheck、package tests、全仓 tests、format check、build、declaration checks、package-name import、`bun pm pack --dry-run` 与 `git diff --check`。

## Implementation Order

1. 建立 diagnostics package、NodeBraidError 和确定性错误描述。
2. 迁移领域 Error 与 details，统一 cause 和 AggregateError tree。
3. 在 Plugin Host seam 注入 Sink/Reporter，并向 Plugin Context 提供 scoped diagnostics。
4. 用 `reportFault()` 替换四份 subscriber/observer error helper。
5. 增加 Host、Installation 和 Activation 初始事件目录及严格顺序测试。
6. 发布 core facade、workspace tooling、README 与声明/pack 验证。

每个阶段都必须保持前一阶段测试通过；不得先在所有调用点铺开 logger 再补公共 Interface。

## Out of Scope

- console、文件、Sentry、OpenTelemetry 或其他生产 Adapter。
- 日志文件格式、rotation、retention、上传、retry、batch、sampling 和 remote transport。
- 全局 logger、全局 event registry、跨进程 trace/span 或分布式 correlation。
- Command/Transaction 成功 tracing、性能 profiling、产品 analytics 和业务 audit。
- 用户可配置 event level、动态事件 schema 或 Runtime Service 形式的 logger。
- 自动恢复、重试、fallback、错误翻译、用户提示文案或 HTTP/RPC 状态映射。
- 自动序列化任意 Plugin、业务数据、Error 自定义属性或环境信息。
- 改变 Plugin failed、Command rejection、Transaction atomicity、History replay 或 Layout cancellation 语义。

## Source of Truth

- 领域术语：`CONTEXT.md`
- 目标分层：`ARCHITECTURE.md`
- 不可逆决策：ADR 0028、0029、0030
- 实施契约：本文件
- 实施顺序：本目录 `issues/`

若实现与旧 baseline 文档或散落示例冲突，以上 source of truth 按此顺序解释；不得以旧 `globalThis.reportError` helper 的实现细节覆盖本设计。
