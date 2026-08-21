---
title: Quick Start
description: 从源码运行一个最小 CFlow Canvas Runtime。
---

# Quick Start

用一个真实的 Canvas Runtime 验证 CFlow：安装 Kernel Plugin，通过公共 `@cflow/core` facade 提交一个 Node，然后完整结束 Plugin Host 生命周期。

::: warning Packages 尚未公开发布
本仓库声明的 `@cflow/*` package 尚未以 CFlow 项目身份发布到 npm。npm 上现有的 `@cflow/core` 属于另一个项目，请不要从 npm 安装这个名称。首发阶段请从源码运行。
:::

## 1. 获取源码

```bash
git clone https://github.com/ZWkang/cflow.git
cd cflow
bun install
```

CFlow 要求 Bun 1.2.19 或更高版本。

## 2. 运行示例

```bash
bun run docs:quick-start
```

命令会先构建公共 facade 及其 workspace 依赖，再执行下面这份与文档共用的示例源码：

<<< ../examples/quick-start.ts{ts}

成功输出：

```text
revision=1 nodes=1
```

## 3. 理解这条链路

1. `createPluginHost()` 创建一份隔离的 Plugin Host。
2. `kernelPlugin` 为自己的 Activation 创建 revision-zero Kernel，并提供 `KernelService`。
3. 应用 Plugin 通过 Required Service 声明 Kernel 依赖，而不是从全局容器动态查找。
4. `KernelService.transact()` 同步、原子地提交 Node，产生 revision 1。
5. `whenActive()` 证明应用 Plugin 已获得全部 Required Services。
6. `host.dispose()` 结束 Installation、Activation 与 Owned Resource 生命周期。

这个示例刻意保持 headless：它验证 Document 与 Runtime 组合，不创建可见画布。当前已经交付的 [`@cflow/renderer-svg`](/modules/renderer-svg) 可在下一层把同一 Canvas 语义投影到 SVG，但不属于这条最小 Kernel 路径。

## 4. 下一层：Basic Canvas Composition 与真实 SVG

如果需要 Kernel、Command、Session、Renderer、Interaction 与 History 的完整基础组合，可以显式选择 SVG Provider 并安装 [`@cflow/preset-basic`](/modules/preset-basic)。下面的 canonical example 与真实 Chromium 验收共用同一份源码：

<<< ../examples/basic-canvas-svg.ts{ts}

这里仍由应用创建 Host、传入现有 SVG Target 并通过静态 Required Service Consumer 取得能力。Preset 不创建默认 Renderer，也不把 SVG 或 DOM 变成通用依赖。
