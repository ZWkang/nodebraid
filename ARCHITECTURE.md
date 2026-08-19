# CFlow 架构设计

CFlow 是一个插件化、渲染器无关的流程画布引擎。它提供稳定的图文档和变更语义，通过 Cordis 组合扩展能力，通过内部响应式数据流分发变化，并允许 Konva、SVG、Canvas 2D、PixiJS 或其他后端实现统一的渲染接口。

本文定义目标架构，不表示其中列出的能力已经实现。

## 设计目标

CFlow 需要满足以下目标：

- Kernel 只维护图数据及其一致性，不依赖 UI 框架、渲染库和业务节点类型。
- 所有对图的修改都经过事务，产生可以观察、记录和重放的标准变化。
- Cordis 负责插件依赖、生命周期、配置和服务组合。
- RxJS 仅用于内部变化传播和异步流程，不成为公开状态 API。
- Renderer 是可替换 Provider，Kernel 不引用任何具体渲染库类型。
- Vue、React 等框架通过薄适配层接入同一个 Canvas 实例。
- 业务规则、布局、历史记录、交互和协同等能力通过插件提供。

CFlow 不在 Kernel 中实现以下内容：

- React、Vue 或其他组件模型。
- Konva、PixiJS、SVG、DOM 或 WebGL 对象。
- 自动布局算法和边路由算法。
- BPMN、DAG、AI Workflow 等业务语义。
- 属性面板、工具栏、菜单和小地图等产品 UI。
- 服务端保存协议和业务数据转换。

## 总体结构

```text
Application
├── React Adapter
├── Vue Adapter
└── Vanilla Adapter
        │
        ▼
Canvas Runtime (Cordis)
├── Renderer Provider
├── Interaction Plugins
├── History Plugin
├── Layout Plugins
├── Validation Plugins
├── Serialization Plugin
└── Domain Plugins
        │
        ▼
Canvas Kernel
├── Document
├── Transaction
├── ChangeSet
├── Query
├── Geometry
└── Runtime Ports
        │
        ▼
Internal Streams (RxJS)
```

各层分别回答不同问题：

| 层                | 主要职责                                           |
| ----------------- | -------------------------------------------------- |
| Canvas Kernel     | 图是什么、图如何发生一致的变化                     |
| RxJS              | 已经发生的变化如何在内部传播和组合                 |
| Cordis Runtime    | 系统具备哪些能力，以及这些能力如何加载、依赖和释放 |
| Renderer Provider | 图和临时视图状态如何显示及命中                     |
| Framework Adapter | Canvas 实例如何挂载到 Vue、React 等应用            |
| Domain Plugin     | 通用图模型如何表达具体业务规则和界面贡献           |

## Canvas Kernel

Kernel 应保持语义完整但能力克制。移除 Cordis、RxJS、Konva、Vue、React 和所有业务插件后，仍然是维护图数据一致性所必需的代码，才适合进入 Kernel。

### Document

Document 是可持久化、可重放的权威状态。节点和边只保存跨渲染器成立的字段。

```ts
type NodeId = string & { readonly __brand: 'NodeId' };
type EdgeId = string & { readonly __brand: 'EdgeId' };

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface CanvasNode<T = unknown> {
  id: NodeId;
  type: string;
  position: Point;
  size?: Size;
  parentId?: NodeId;
  data: T;
}

interface CanvasEdge<T = unknown> {
  id: EdgeId;
  type: string;
  source: NodeId;
  target: NodeId;
  sourcePort?: string;
  targetPort?: string;
  data: T;
}

interface CanvasDocument {
  version: number;
  revision: number;
  nodes: ReadonlyMap<NodeId, CanvasNode>;
  edges: ReadonlyMap<EdgeId, CanvasEdge>;
  extensions: Readonly<Record<string, unknown>>;
}
```

`data` 归节点或边类型插件解释。`extensions` 按插件命名空间保存需要随文档持久化的数据，插件不得写入其他插件的命名空间。

Document 不保存 hover、拖拽预览、指针位置等瞬时状态。Selection 和 Viewport 属于编辑器实例状态，应与可持久化图数据明确分离。

### Transaction

所有图数据写入必须经过 Transaction。插件和 Renderer 不得直接修改 Document 内部集合。

```ts
canvas.transact(
  {
    origin: 'user',
    commandId: 'node.move',
  },
  (tx) => {
    tx.moveNode(nodeId, nextPosition);
  },
);
```

Transaction 负责：

- 原子提交一组变化。
- 校验节点和边的引用完整性。
- 在成功提交后递增 revision。
- 生成一份标准 ChangeSet。
- 失败时不暴露部分写入状态。

系统只有一条权威写入路径：

```text
Command or API Request
        │
        ▼
    Transaction
        │
        ▼
     Document
        │
        ▼
     ChangeSet
```

### ChangeSet

ChangeSet 描述一次已提交事务产生的变化，是 Renderer、History、Persistence、Validation 和 Collaboration 等能力的共同输入。

```ts
interface ChangeSet {
  beforeRevision: number;
  revision: number;
  origin?: string;
  commandId?: string;
  changes: readonly GraphChange[];
}

type GraphChange =
  | { type: 'node.add'; node: CanvasNode }
  | { type: 'node.update'; id: NodeId; patch: Partial<CanvasNode> }
  | { type: 'node.remove'; id: NodeId }
  | { type: 'edge.add'; edge: CanvasEdge }
  | { type: 'edge.update'; id: EdgeId; patch: Partial<CanvasEdge> }
  | { type: 'edge.remove'; id: EdgeId };
```

ChangeSet 表达图变化，不携带 Konva Shape、DOM Element、ReactNode 或其他视图对象。

### Query 与索引

Kernel 对外提供稳定查询接口，并可以在内部维护邻接表、父子关系和空间索引。

```ts
interface CanvasQuery {
  getNode(id: NodeId): CanvasNode | undefined;
  getEdge(id: EdgeId): CanvasEdge | undefined;
  getIncomingEdges(id: NodeId): readonly CanvasEdge[];
  getOutgoingEdges(id: NodeId): readonly CanvasEdge[];
  getChildren(id: NodeId): readonly CanvasNode[];
  getSnapshot(): CanvasSnapshot;
}
```

索引属于派生状态。序列化只保存 Document，索引从 Document 重建。

### 坐标与几何

Kernel 定义世界坐标、屏幕坐标、节点边界和 Viewport 的通用数学语义。Renderer 负责将这些语义转换为具体渲染后端的矩阵和对象属性。

```text
World Point ──Viewport Transform──▶ Screen Point
Screen Point ──Inverse Transform──▶ World Point
```

Renderer 测量出的节点尺寸必须通过明确的 measurement 操作回报，不能由 Kernel 读取渲染对象内部状态。

## Plugin Host 与 Cordis implementation

Plugin Host 是 CFlow 的能力组合层，不参与节点拖动、命中检测和逐帧绘制等高频路径。普通消费者从 `@cflow/core` 使用 CFlow 自己的 Plugin Host interface；`@cflow/core` 将同一份 interface 和实现重导出自 `@cflow/runtime-cordis`。后者是高级消费者可直接导入的窄包，并在内部使用 Cordis，不反向依赖 core，也不公开 Cordis Context、Fiber、Service 或 effect 类型。

```text
Application ──▶ @cflow/core ──▶ @cflow/runtime-cordis ──▶ cordis
Advanced Consumer ────────────▶ @cflow/runtime-cordis
```

首版的 “Everything is Plugin” 指 Kernel、Session、Command、Renderer、Interaction、History 等 Canvas 能力都通过 Plugin 和 Runtime Service 组合；最小 Plugin Host substrate 本身不是 Plugin。一个新 Host 不隐式安装任何 Canvas 能力，Canvas Composition 必须用 Child Installation 显式声明所需能力。

每项完整能力按照以下角色组织：

- Service Definition：声明消费者可以依赖的接口。
- Service Provider：提供具体实现，例如 Konva Renderer 或 Dagre Layout。
- Consumer Plugin：使用服务增加用户能力，例如自动布局命令。

插件通过 CFlow Plugin Context 注册 Owned Resource。Plugin Installation 结束后，它注册的命令、监听器、节点类型、快捷键和 UI 贡献必须同时消失。

```ts
import { definePlugin, historyService } from '@cflow/core';

const historyConsumer = definePlugin({
  requires: { history: historyService },
  setup(context) {
    const unsubscribe = context.services.history.subscribe(() => {
      console.log(context.services.history.getSnapshot());
    });
    context.own(unsubscribe);
  },
});
```

官方 `historyPlugin` 同时要求 Kernel Service 与 Command Service，提供窄 `historyService`；Undo/Redo 只通过强类型 Command token 执行。

适合由插件提供的能力包括：

- 节点和边类型注册。
- 命令、快捷键和菜单贡献。
- 选择、拖拽、框选、连线和缩放交互。
- Undo/Redo、Clipboard 和 History。
- Layout、Edge Routing 和 Snap/Grid。
- Validation、Serialization 和 Persistence。
- Minimap、Inspector、Toolbar 和 Overlay。
- Collaboration、Comments 和 Presence。
- BPMN、DAG、AI Workflow 等领域能力。

## RxJS 内部数据流

RxJS 用于传播已经提交的变化以及组合异步任务。它不保存 Document 的权威状态，也不作为 Vue/React 用户必须理解的公开 API。

适合使用 RxJS 的内部通道包括：

```text
documentChanges$
selectionChanges$
viewportChanges$
pointerEvents$
layoutRequests$
validationResults$
persistenceRequests$
```

推荐的数据流是：

```text
Authoritative Document
        │
    Transaction
        │
     ChangeSet
        │
       RxJS
        │
Renderer / Plugins / Framework Adapters
```

不应将每块状态拆成彼此可写的 `BehaviorSubject`。多个可写流会引入提交顺序、状态同步、撤销粒度和中间渲染问题。

公共订阅接口应隐藏 RxJS：

```ts
interface Disposable {
  dispose(): void;
}

interface CanvasObserver {
  observeChanges(listener: (changes: ChangeSet) => void): Disposable;
  observeSelection(listener: (selection: SelectionSnapshot) => void): Disposable;
  observeViewport(listener: (viewport: Viewport) => void): Disposable;
}
```

## Renderer Provider

Renderer 是可替换能力。Kernel 只依赖 CFlow 自己定义的渲染接口。

```ts
interface RendererCapabilities {
  htmlOverlay: boolean;
  nativeTextEditing: boolean;
  imageExport: boolean;
  gpuAcceleration: boolean;
  accessibilityTree: boolean;
}

interface CanvasRenderer {
  readonly capabilities: RendererCapabilities;

  mount(container: HTMLElement): void;
  setDocument(snapshot: CanvasSnapshot): void;
  applyChanges(changeSet: ChangeSet): void;
  setViewport(viewport: Viewport): void;
  setSelection(selection: SelectionSnapshot): void;
  hitTest(point: ScreenPoint): HitResult | undefined;
  dispose(): void;
}
```

Renderer Provider 可以包括：

```text
@cflow/renderer-konva
@cflow/renderer-pixi
@cflow/renderer-svg
@cflow/renderer-canvas2d
@cflow/renderer-headless
```

Renderer 能力并不完全相同。依赖 HTML Overlay、原生文本编辑、GPU 或可访问性树的插件必须声明要求；当前 Renderer 无法满足时，Runtime 应明确拒绝加载并指出缺少的能力。

渲染接口应表达节点、边、选择和 Viewport 等画布语义，不应抽象成 `drawRect()`、`drawLine()` 等通用绘图 API。后者会迫使 CFlow 重新实现一个只能表达最小公约数的图形库。

## Konva Renderer

Konva 可以作为 CFlow 官方 Canvas 2D Renderer Provider 的候选之一；首版不选择默认 Renderer。Konva Provider 可以直接承担：

- Stage、Layer、Group 和 Shape 场景树。
- Canvas 绘制和批量重绘。
- 事件冒泡、命中检测和基础拖拽。
- Transformer、缓存、动画和图片导出。

Konva 不承担：

- CanvasDocument 和业务数据模型。
- Transaction、ChangeSet 和图查询。
- Undo/Redo 和协同协议。
- 图连接规则、布局和边路由。
- 服务端存储格式。

Konva 对象是 Document 的视图投影：

```text
CanvasNode          → Konva.Group
CanvasEdge          → Konva.Line or Konva.Arrow
Selection           → Konva.Transformer or selection shape
Viewport            → Konva.Stage transform
```

`Konva.Stage.toJSON()` 不能作为 CFlow 的文档格式。CFlow 保存 CanvasDocument，并在挂载 Renderer 时重新构建 Konva 场景树。

初始图层可以控制在以下范围：

```text
background
edges
nodes
interaction
```

每个 Konva Layer 对应一个 Canvas 元素。Renderer 应减少图层数量，关闭非交互 Shape 的事件监听，对复杂静态 Shape 使用缓存，并根据 ChangeSet 只重绘受影响的图层。

## 全 Canvas 与混合渲染

全 Canvas 模式适合由图形、图标和普通文字组成的节点。节点需要表单、富文本、浏览器原生焦点或复杂 Vue/React 组件时，应使用混合渲染：

```text
Konva Background Layer
Konva Edge Layer
HTML Node Layer
Konva Interaction Layer
HTML Overlay Layer
```

混合渲染中的 Canvas 和 HTML 必须共享同一套世界坐标、Viewport 变换、层级和选择语义。HTML 节点仍然是 Document 的视图，不得成为另一份权威状态。

## Vue 和 React 集成

Vue/React Adapter 只负责 Canvas 实例的挂载、卸载和框架状态投影。为了保持 Renderer 与框架无关，官方 Konva Renderer Provider 若实现，应直接依赖 `konva`，不依赖 `react-konva` 或 `vue-konva`。

```ts
interface CanvasMount {
  mount(container: HTMLElement): Disposable;
}
```

React Adapter 可以使用 `useSyncExternalStore` 消费快照；Vue Adapter 可以使用 `shallowRef` 保存需要参与模板更新的投影。两者都不公开 RxJS Observable，也不复制 Document 的写入能力。

## 命令与交互

Renderer 捕获输入事件，Interaction Plugin 将输入解释为命令，Command 调用 Transaction，Renderer 再消费 ChangeSet 更新显示。

```text
Pointer or Keyboard Event
        │
        ▼
Interaction Plugin
        │
        ▼
      Command
        │
        ▼
   Transaction
        │
        ▼
    ChangeSet
        │
        ▼
     Renderer
```

拖拽过程中的指针位置和预览位置可以保存在 Interaction Plugin 内部。最终位置在提交 Transaction 后进入 Document。这样可以避免高频 pointermove 对持久化状态、历史记录和协同协议造成不必要压力。

## 推荐包结构

```text
packages/
├── kernel/
│   ├── document.ts
│   ├── transaction.ts
│   ├── changes.ts
│   ├── query.ts
│   ├── geometry.ts
│   └── identifiers.ts
├── runtime-cordis/
├── plugin-command/
├── plugin-session/
├── renderer-api/
├── renderer-konva/
├── interaction-core/
├── plugin-history/
├── layout-api/
├── validation/
├── serialization/
├── adapter-react/
├── adapter-vue/
└── preset-basic/
```

`preset-basic` 负责组装可立即使用的基础编辑器，但不改变各包之间的依赖方向。

```text
Framework Adapter ─┐
Renderer Provider ─┼──▶ Runtime ──▶ Kernel
Feature Plugins ───┘
```

Kernel 不反向依赖 Runtime、Renderer 或 Framework Adapter。

## 复杂度控制规则

以下规则用于防止 Kernel 随功能增长而膨胀：

1. Kernel 只接受跨渲染器成立的数据和操作。
2. 所有 Document 写入只经过 Transaction。
3. RxJS 传播变化，但不拥有权威状态。
4. Renderer 对象不能进入 Document、ChangeSet 或公共业务模型。
5. 插件只能通过注册、查询、命令和事务扩展系统，不能修改 Kernel 私有集合。
6. 插件注册必须具有对应的释放操作。
7. 派生索引和渲染对象可以重建，不进入持久化格式。
8. 业务协议通过 Adapter 转换，不污染通用节点和边字段。
9. Renderer 不支持插件要求的能力时明确失败，不静默降级。
10. 高频瞬时状态留在 Interaction 或 Renderer，稳定结果才提交到 Document。

## 参考项目

- [Cordis](https://cordis.js.org/)：插件上下文、服务依赖和生命周期模型。
- [Konva](https://konvajs.org/docs/)：Canvas 2D 场景树、交互和渲染能力。
- [FlowGram.AI](https://github.com/bytedance/flowgram.ai)：流程编辑器能力组合和业务工作流场景。
- [XYFlow](https://github.com/xyflow/xyflow)：框架化节点编辑和交互 API。
- [AntV X6](https://github.com/antvis/X6)：图编辑基础设施与扩展机制。
- [LogicFlow](https://github.com/didi/LogicFlow)：流程图编辑器与业务扩展。
- [Rete](https://github.com/retejs/rete)：插件化节点编辑器模型。
- [tldraw](https://github.com/tldraw/tldraw)：编辑器状态、工具系统和形状扩展。
