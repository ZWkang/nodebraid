---
title: '@nodebraid/plugin-port'
description: Activation-scoped Port Contribution 与确定性 Snapshot Runtime。
---

# `@nodebraid/plugin-port`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

`portPlugin` 为一个 Canvas Runtime 提供窄 `portService`。Node 类型或领域 Plugin 使用 `createPortContributionPlugin()` 注册具名、同步、只依赖当前已提交 Node 值的 Port Contribution；Activation 结束时 Registration 自动释放并通知 Renderer 与 Interaction 重验。

```ts
import { createPortContributionPlugin } from '@nodebraid/plugin-port';

const taskPorts = createPortContributionPlugin({
  id: 'acme.task-ports',
  definePorts(node) {
    return node.type === 'task'
      ? [
          { id: 'input', role: 'target' },
          { id: 'output', role: 'source' },
        ]
      : [];
  },
});
```

Service 会按 Contribution ID 与 Port ID 确定性解析并冻结 `PortSnapshot`。重复 Contribution ID、同 Node 重复 Port ID、畸形定义与 disposed Service 都显式失败；subscriber fault 通过稳定 diagnostics 报告。本 package 不建立 Port Entity、Persistence、通用 Registry、业务 Validation 或产品 UI。
