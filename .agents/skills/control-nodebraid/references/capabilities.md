# 能力验证地图

所有命令从仓库根目录执行。先按能力选择现有入口，再读对应测试确定具体断言；本文件负责导航和复现，不维护第二套测试实现。

开发变更可先使用自动范围选择：

```bash
bun run check:affected             # 比较 HEAD，包含暂存、未暂存和未跟踪文件
bun run check:affected --base main # 从 main 与 HEAD 的 merge-base 比较
bun run check:affected --plan      # 仅展示范围，可与 --base 组合
```

选择器沿 workspace 生产和开发依赖包含消费者，再按静态 import 选择根组合测试（包括其本地 fixture 引用的包）及相关 browser suite。`website/` 变更或受影响范围包含 `@nodebraid/core` 时运行文档检查。共享工具、workflow、未映射到 workspace 的非 Markdown 文件、Agent 工作流 Markdown 和 `AGENTS.md` 变更运行全量；workspace 和 website 之外的其他 Markdown 只检查格式。输出的范围不代表检查已经执行。

## 入口导航

| 能力                                                                     | 现有命令与构建前置                                                                                                                                                                                                                                      | 源测试 / 示例                                                                                                                                                                                                                                                                                                                                              | 验证层级                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Basic SVG Example：Selection、拖拽、连接、History、Duplicate、Clipboard  | `bun run example:test`；自动构建 core、renderer-svg、adapter-react 和 Example，再依次运行两个 browser 文件。见 [scripts](../../../../examples/app/package.json)。                                                                                       | [Basic SVG](../../../../examples/app/browser-tests/basic-svg.browser.ts)、[Clipboard](../../../../examples/app/browser-tests/clipboard.browser.ts)、[页面](../../../../examples/app/src/routes/basic-svg.tsx)                                                                                                                                              | 生产构建上的真实 Chromium 输入与 DOM 观察                              |
| Interaction：选择、移动、创建/删除 Edge、输入清理                        | `bun run --filter '@nodebraid/plugin-interaction' test`；内含 `build:test-dependencies` 与 `test:self`，先构建生产依赖与 History。见 [scripts](../../../../packages/plugin-interaction/package.json)。                                                  | [Selection](../../../../packages/plugin-interaction/tests/selection-transition.test.ts)、[Move Nodes](../../../../packages/plugin-interaction/tests/move-nodes-command.test.ts)、[Port Connection](../../../../packages/plugin-interaction/tests/port-connection.test.ts)、[输入清理](../../../../packages/plugin-interaction/tests/input-cleanup.test.ts) | Bun 公共 Service / Command / Renderer Input seam；不证明浏览器原生输入 |
| History：提交记录、撤销/重做、重放一致性                                 | `bun run --filter '@nodebraid/plugin-history' test`；内含 `build:dependencies` 与 `test:self`，构建 Command、Kernel Plugin 及传递依赖。见 [scripts](../../../../packages/plugin-history/package.json)。                                                 | [History](../../../../packages/plugin-history/tests/index.test.ts)                                                                                                                                                                                                                                                                                         | Bun 公共 Command / Kernel / History seam                               |
| Duplicate Selection：复制行为、快捷键、生命周期                          | `bun run --filter '@nodebraid/plugin-duplicate-selection' test`；内含 `build:test-dependencies` 与 `test:self`，构建生产依赖与 History。见 [scripts](../../../../packages/plugin-duplicate-selection/package.json)。                                    | [行为](../../../../packages/plugin-duplicate-selection/tests/index.test.ts)、[快捷键](../../../../packages/plugin-duplicate-selection/tests/shortcut.test.ts)、[生命周期](../../../../packages/plugin-duplicate-selection/tests/lifecycle.test.ts)                                                                                                         | Bun 公共行为与快捷键 seam；原生快捷键见 Example                        |
| Clipboard：复制/粘贴、失败、与 Duplicate 组合                            | `bun run --filter '@nodebraid/plugin-clipboard' test`；内含 `build:test-dependencies` 与 `test:self`，构建生产依赖、Duplicate Selection 与 History。见 [scripts](../../../../packages/plugin-clipboard/package.json)。                                  | [行为](../../../../packages/plugin-clipboard/tests/behavior.test.ts)、[失败](../../../../packages/plugin-clipboard/tests/failures.test.ts)、[组合](../../../../packages/plugin-clipboard/tests/duplicate-composition.test.ts)                                                                                                                              | Bun 公共行为与 transport / codec seam；浏览器权限见 Example            |
| SVG Renderer：DOM、坐标、Focus、Pointer Capture、投影与清理              | `bun run --filter '@nodebraid/renderer-svg' test:browser`；依次执行 `build:test-dependencies`、本包 `build:self` 与 browser suite；准备生产依赖及 Renderer Plugin、Interaction、History。见 [scripts](../../../../packages/renderer-svg/package.json)。 | [browser suite](../../../../packages/renderer-svg/browser-tests/renderer-contract.browser.ts)、[场景实现](../../../../packages/renderer-svg/browser-tests/renderer-contract.entry.ts)                                                                                                                                                                      | 真实 Chromium 的 Renderer 公共契约与原生输入                           |
| React Adapter：Runtime mount / dispose、Strict Mode、竞态、Snapshot 投影 | `bun run --filter '@nodebraid/adapter-react' test:browser`；内含普通 `build` 与 `test:browser:self`，自动构建本包和 Kernel / Session / History Plugin 依赖。见 [scripts](../../../../packages/adapter-react/package.json)。                             | [browser suite](../../../../packages/adapter-react/browser-tests/runtime-mount.browser.ts)、[场景实现](../../../../packages/adapter-react/browser-tests/runtime-mount.entry.tsx)                                                                                                                                                                           | 真实 React / DOM 生命周期；无需绕过 Example 操纵内部 Runtime           |
| Layout Runtime：命令提交、输入验证、过期 Proposal 拒绝                   | `bun run --filter '@nodebraid/plugin-layout' test`；内含 `build:dependencies` 与 `test:self`，构建 Layout API、Kernel Plugin、Command Plugin 及传递依赖。见 [scripts](../../../../packages/plugin-layout/package.json)。                                | [提交](../../../../packages/plugin-layout/tests/index.test.ts)、[请求验证](../../../../packages/plugin-layout/tests/request-validation.test.ts)、[提交保护](../../../../packages/plugin-layout/tests/commit-protection.test.ts)                                                                                                                            | Bun 公共 Layout Command seam；当前 Example 没有 Layout 控件            |
| Dagre Layout Provider                                                    | `bun run --filter '@nodebraid/layout-dagre' test`；内含 `build:dependencies` 与 `test:self`，构建 Layout API 及传递依赖。见 [scripts](../../../../packages/layout-dagre/package.json)。                                                                 | [Dagre](../../../../packages/layout-dagre/tests/index.test.ts)、[Provider 契约](../../../../tests/layout-provider-contract.ts)                                                                                                                                                                                                                             | Bun 中真实 Dagre 计算与公共 Provider 契约                              |
| ELK Layout Provider                                                      | `bun run --filter '@nodebraid/layout-elk' test`；内含 `build:dependencies` 与 `test:self`，构建 Layout API 及传递依赖。见 [scripts](../../../../packages/layout-elk/package.json)。                                                                     | [ELK](../../../../packages/layout-elk/tests/index.test.ts)、[增量与固定位置](../../../../packages/layout-elk/tests/incremental.test.ts)                                                                                                                                                                                                                    | Bun 中真实 ELK 计算与公共 Provider 契约                                |

依赖未安装时运行 `bun install`。真实浏览器 suite 使用仓库锁定的 `agent-browser`；Chromium 未安装时运行 `bunx agent-browser install`，Linux CI 使用 `bunx agent-browser install --with-deps`。命令以 [仓库说明](../../../../AGENTS.md) 和各 package scripts 为准。

表内普通命令自动准备各自的生产或测试依赖，无需先手动重复构建。构建调度在一次调用内按生产依赖拓扑去重，不跨次缓存。`:self` 是完整检查或定向调度在依赖准备后使用的内部步骤，不替代独立执行时的普通入口。

现有 browser suite 按文件内顺序运行全部场景，结束时关闭自己的 browser session 和 server；没有按场景名称筛选或运行后保留现场的 CLI 参数。Bun 测试可在完成表内构建前置后指定测试文件，browser 场景不能照搬这种筛选方式。需要持续查看页面时使用 `bun run example:dev`，打开其实际输出地址的 `/basic-svg?lang=en`；修改 workspace package 源码后重新执行该入口，让依赖产物更新。

## Example 的共用 Fixture 与观察方式

[Runtime Factory](../../../../examples/app/src/example-runtime/create-example-runtime.ts) 创建三个 Node：`example-discover`、`example-compose`、`example-ship`，以及从 discover 的 `output` 到 compose 的 `input` 的初始 Edge。每个配方独立从新页面或 `[aria-label="Reset example"]` 开始，等待 `[data-example-status="ready"]` 和初始指标恢复；确认 `.canvas-target` 已挂载。用 `?lang=en` 固定下文控件名称和显示文本。

初始指标为 revision `1`、nodes `3`、edges `1`、selection `None`、zoom `1.00×`、history `Undo / —`。它们来自 `[data-example-metric="revision"]` 等元素的文本；这些是公共 Service 投影后的显示值，不是完整 Canvas Snapshot，也不能从 DOM 还原权威 Document。需要完整状态或事务不变量时，回到表中的公共 seam 测试。

浏览器操作使用真实点击、Pointer、键盘输入；坐标从当前元素 `getBoundingClientRect()` 获取，滚动或缩放后重新读取。需要固定世界坐标时先点击 `[aria-label="Reset view"]`，确认 zoom 为 `1.00×`，再把 Target-local 点加上 `.canvas-target` 当前 bounds 的 left/top。键盘操作前确认 `document.activeElement` 是 `.canvas-target`。下述 assert 只指出观察目标；精确断言和边界用例仍以链接的测试为准。

### Selection / 框选

- **Fixture**：共用初始图，Reset view。
- **Reach**：将 `.canvas-target` 滚入可见区域；定位 `[data-nodebraid-node-id="example-discover"]`，或取 Target-local `(40, 40)` 到 `(550, 370)` 的框选范围。
- **Act**：真实点击 discover；另一次从初始图的空白处按下、拖动、松开完成框选。
- **Assert**：点击后 selection 包含 discover；框选过程中出现 `[data-nodebraid-box-selection]`，松开后消失，Selection 包含 compose 与 discover。Selection 不增加 Document revision，也不新增 History。见 [Basic SVG Selection 场景](../../../../examples/app/browser-tests/basic-svg.browser.ts)。

### Node 拖拽

- **Fixture**：共用初始图，Reset view；discover 的初始世界位置为 `(80, 100)`。
- **Reach**：点击选中 `[data-nodebraid-node-id="example-discover"]`，读取该元素当前屏幕中心。
- **Act**：从中心真实按下，向右移动 `60`、向下移动 `40` CSS pixels，再松开。
- **Assert**：discover 的 SVG `x/y` 投影为 `(140, 140)`，Document 只增加一次 revision，Node / Edge 数量不变；用 Undo 验证移动可以撤销。见 [Example 拖拽](../../../../examples/app/browser-tests/basic-svg.browser.ts)；并发位置冲突等语义见 [Move Nodes](../../../../packages/plugin-interaction/tests/move-nodes-command.test.ts)。

### Port Connection

- **Fixture**：共用初始图，保留三个 Node 与初始 Edge。
- **Reach**：source 为 `[data-nodebraid-port-node-id="example-compose"][data-nodebraid-port-id="output"][data-nodebraid-port-role="source"]`；target 为 `[data-nodebraid-port-node-id="example-ship"][data-nodebraid-port-id="input"][data-nodebraid-port-role="target"]`。滚动画布到可见区域后读取两者中心。
- **Act**：从 source 真实按下，拖到 target，再松开。
- **Assert**：拖动时出现 `[data-nodebraid-connection-preview]`；提交后 Edge 数量从 `1` 变成 `2`，Node 数量不变，revision 增加一次。Pointer Capture 与 Port 匹配的精确证据见 [Example 连接](../../../../examples/app/browser-tests/basic-svg.browser.ts)、[Port Connection](../../../../packages/plugin-interaction/tests/port-connection.test.ts) 和 [Renderer suite](../../../../packages/renderer-svg/browser-tests/renderer-contract.browser.ts)。

### History / Undo / Redo

- **Fixture**：共用初始图；初始化图本身已经形成一条 History 记录。
- **Reach**：定位 `[aria-label="Undo"]` 与 `[aria-label="Redo"]`。
- **Act**：依次真实点击 Undo、Redo；也可在完成一次拖拽或连接后验证该操作的撤销/重做。
- **Assert**：从初始图 Undo 会清空 Node / Edge，Redo 恢复初始图；按钮 disabled 状态与 history 指标对应。每次重放产生新的 revision，不能期待 revision 回退。见 [Example History](../../../../examples/app/browser-tests/basic-svg.browser.ts) 和 [History 公共契约](../../../../packages/plugin-history/tests/index.test.ts)。

### Duplicate Selection

- **Fixture**：共用初始图，Duplicate Shortcut 仍启用。
- **Reach**：点击 `[data-nodebraid-node-id="example-discover"]`，确认 Selection 和 Canvas Focus。
- **Act**：发送真实 `Ctrl/Cmd+D`；随后点击 Undo、Redo。验证 shortcut 释放时，点击 `[aria-label="Disable duplicate shortcut"]` 后重新聚焦 Canvas，再发送同一组合键。
- **Assert**：首次复制新增并选中 `example-duplicate-node-1`，形成一次可撤销的图变更；shortcut 释放后同一按键不再复制。原生事件是否 trusted、默认动作是否阻止，复用 [Example Duplicate 场景](../../../../examples/app/browser-tests/basic-svg.browser.ts)；ID、边界与生命周期语义见 [Duplicate 测试](../../../../packages/plugin-duplicate-selection/tests/index.test.ts)。

### Clipboard Copy / Paste

- **Fixture**：共用初始图，Clipboard Shortcuts 仍启用；浏览器必须具备真实剪贴板读写条件。自动化权限场景使用现有 [Clipboard browser suite](../../../../examples/app/browser-tests/clipboard.browser.ts) 创建独立 browser context 并显式设置权限。
- **Reach**：点击 `[data-nodebraid-node-id="example-discover"]`，确认 Selection 和 Canvas Focus。
- **Act**：发送真实 `Ctrl/Cmd+C`，再发送 `Ctrl/Cmd+V`；之后用 Undo、Redo 验证粘贴。要复现权限拒绝、外部文本或 shortcut 释放，运行现有 suite，不把浏览器拒绝替换成内存剪贴板成功。
- **Assert**：Copy 不改变 Document；Paste 新增并选中 `example-clipboard-node-1`，形成一次可撤销提交。观察 `[data-example-metric="clipboard-failure"]`；权限拒绝和 decode failure 应保留可见错误且不改图。Envelope、原生事件和失败的精确断言见 [Clipboard browser suite](../../../../examples/app/browser-tests/clipboard.browser.ts)；应用拥有的格式与 transport 见 [Clipboard adapters](../../../../examples/app/src/example-runtime/clipboard-adapters.ts)。

## 证据范围

保存实际命令、退出码、相关日志，以及操作前后指标、DOM 或截图；一次 ready、页面截图或命令启动不等于能力通过。浏览器 console / Runtime 错误保留原始失败信息。定向验证只证明所执行的范围；完整工程验收仍使用 [根 scripts](../../../../package.json) 的 `bun run check`。托管任务在定向检查与双轴 review 后由 `agents:run verify` 执行一次全量，不提前人工重复执行；新尝试仍真实运行，正式交付沿用 [本地 Agent 工作流](../../../../docs/agents/agentic-workflows.md) 的验证记录。
