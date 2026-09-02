---
title: '@nodebraid/port-api'
description: Document 之外的不可变 Port 定义与 Snapshot 值契约。
---

# `@nodebraid/port-api`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

`@nodebraid/port-api` 定义 `PortDefinition`、`NodePortSnapshot` 与 `PortSnapshot`，以及只读查询 helper。Port 只有所属 Node 内的稳定 `id` 与 `source | target` role；Snapshot 与一个已提交 Document revision 和当前 contribution generation 对齐。

这些值不是 Document Entity、Serialized Port 或 Renderer handle。Document 仍只在 Edge Endpoint 保存可选 `portId`；Runtime 注册属于 [`@nodebraid/plugin-port`](/modules/plugin-port)，具体 Geometry 与 Hit 属于 Renderer Provider。

本 package 只依赖 Kernel identity，不依赖 Runtime、Renderer、DOM、Persistence 或 `@nodebraid/core`。
