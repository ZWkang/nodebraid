# React Adapter v0 生态对比

本记录在 `@nodebraid/adapter-react` MVP 已经通过 package 与真实 Chromium 验证后完成。
范围只包括会改变当前 seam 判断的 React integration 差异；它不是功能清单，也不把其他
项目的产品模型直接移植到 NodeBraid。资料核对日期为 2026-09-04。

## 当前决定

NodeBraid React Adapter 只公开 callback-ref Runtime Mount 与 Kernel、Session、History
Snapshot Hooks。应用仍拥有 Plugin composition、Renderer Provider、Target、Commands 与
产品 UI。Adapter 不公开 Provider/Context、selector、React Node Component、受控
Document、写入代理或 Renderer JSX。

## 会影响设计判断的差异

### React Flow

React Flow 的 [`<ReactFlow />`](https://reactflow.dev/api-reference/react-flow) 同时是
React Renderer、交互入口和 controlled/uncontrolled graph-state interface；
[`<ReactFlowProvider />`](https://reactflow.dev/api-reference/react-flow-provider) 把内部
store 放入 Context，`useReactFlow()` 暴露读写 instance，而
[`useStore()`](https://reactflow.dev/api-reference/hooks/use-store) 提供 selector 与 equality
function。

这不是 NodeBraid v0 的同一 seam：NodeBraid 已经把 Document authority、Renderer 与
Runtime Service 分开。当前不应因此加入 Provider、controlled Document 或写入代理。
唯一候选改进是 selector，但只有真实 React 页面出现由完整稳定 Snapshot 引发的可测重渲染
问题时，才应单独设计；当前三个 Snapshot 很小，没有这项证据。

### tldraw

tldraw 用 [`<Tldraw />`](https://tldraw.dev/quick-start) 交付完整 React canvas 与 UI，通过
`onMount` 或 Context 内的 [`useEditor()`](https://tldraw.dev/docs/editor) 暴露一个同时读取、
写入并控制工具的广泛 Editor interface。其响应式读取使用
[`useValue()` / `track`](https://tldraw.dev/sdk-features/signals)。

这证明 Context 与自动依赖追踪适合一个 React-first、内聚的完整 Editor，但不证明它们适合
NodeBraid 的 renderer-agnostic Runtime seam。只有多个深层产品模块出现持续 prop plumbing
证据时才重新评估 Context；即使届时加入，Context 也不应把写入与所有 Renderer 能力聚成
新的 god object。

### X6

X6 的独立 [`@antv/x6-react-shape`](https://x6.antv.antgroup.com/tutorial/intermediate/react)
把 React Component 注册为 Node 内容，并在需要继承外部 Context 时提供 Portal 模式。它
解决的是 Node 视图和 React tree placement，不是 Graph/Runtime 的异步 mount 与稳定
Snapshot 投影。

因此 React Node Component、Portal 与 HTML overlay 仍属于未来 Renderer/混合渲染 seam，
不能加入本 Adapter。若 NodeBraid 出现复杂表单或富文本 Node 的真实需求，应以 Renderer
Target、坐标、命中、焦点和 cleanup 为完整问题另行设计，而不是扩展 `useRuntimeMount()`。

### Rete

Rete 的 React Renderer Plugin 负责 Node、Connection、Socket 与 Control Component；同时
其官方 [`useRete(createEditor)`](https://retejs.org/docs/guides/renderers/react/) 返回 callback
ref 与 Editor，并要求创建结果提供 `destroy()`，专门处理动态更新时旧 Editor 的替换。

`useRete` 直接支持了 callback-ref 是一个真实、高杠杆 React mount seam，而不是要求公开
命令式 controller。不过 Rete 将该 Hook 与 React Renderer Plugin 放在同一生态 package；
NodeBraid 仍保持 Adapter 与 Renderer Provider 分离，并额外保留 async Factory、
pending/ready/failed、Strict Mode 串行、迟到结果 dispose 与 Failure Reporter 语义。

## 结论与候选改进

对比没有推翻 v0 Interface，也没有提供应立即增加功能的使用证据。保留三个明确候选：

1. 只有可测的 Snapshot 重渲染成本出现后，再评估 selector；
2. 只有多个深层 React consumer 出现持续 prop plumbing 后，再评估 opt-in Context；
3. 只有复杂 React Node/HTML overlay 成为真实 Renderer 需求后，另行设计混合渲染 seam。

三者都不属于当前 Adapter v0，也不会在本轮自动实现。
