---
title: Foundations
description: NodeBraid 的公共入口、Plugin 生命周期与统一诊断契约。
---

# 基础能力 Foundations

Foundations 是 NodeBraid 其余能力共同依赖的底座。它不直接提供 Document、Command、Layout 或 Renderer，而是回答三个更基础的问题：应用从哪里进入、能力如何组合与释放、不同 package 如何表达可观察的错误和事件。

::: warning Packages 尚未公开发布
当前 `@nodebraid/*` package 尚未以 NodeBraid 项目身份公开发布。这里的包名描述源码中的模块边界，不代表可以从 npm 安装。
:::

## 三个模块，各守一条边界

| 模块                                                     | 负责                                                               | 不负责                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| [`@nodebraid/core`](../modules/core)                     | 汇总 NodeBraid 当前公共 API，作为普通应用的首选 facade             | 创建新的运行时语义、自动安装能力或选择 Provider          |
| [`@nodebraid/runtime-cordis`](../modules/runtime-cordis) | 提供 NodeBraid-owned Plugin Host、Plugin、Service Token 与生命周期 | Document、Command、Session、持久化或任何默认 Canvas 能力 |
| [`@nodebraid/diagnostics`](../modules/diagnostics)       | 定义结构化错误、不可变 Diagnostic Event 与安全描述函数             | console、文件、网络、重试、批量或持久化                  |

## 依赖方向

```text
Application ───────────────▶ @nodebraid/core ─────▶ NodeBraid public packages
Advanced runtime consumer ─▶ @nodebraid/runtime-cordis ─▶ @nodebraid/diagnostics
Pure NodeBraid packages ───────▶ @nodebraid/diagnostics
```

- 普通应用从 `@nodebraid/core` 使用统一入口。
- 需要控制依赖面的高级消费者可以直接导入窄 package。
- NodeBraid 内部 package 直接依赖自己的下层契约，不反向依赖 `@nodebraid/core`。
- `@nodebraid/runtime-cordis` 在内部使用 Cordis，但公共类型中只有 NodeBraid 自己的 Plugin、Plugin Context、Runtime Service 与 Installation 语义。

## 如何选择入口

从 [`@nodebraid/core`](../modules/core) 开始，适合需要 Kernel、Runtime Plugin、Layout API 或 Renderer contract 的应用代码。

只有在编写运行时基础设施、希望依赖最小化时，才直接使用 [`@nodebraid/runtime-cordis`](../modules/runtime-cordis)。它只创建一个空 Plugin Host；Canvas 能力仍需应用显式安装。

只有在编写 NodeBraid package、诊断 Adapter 或统一错误边界时，才直接使用 [`@nodebraid/diagnostics`](../modules/diagnostics)。它提供协议和确定性转换，不提供日志后端。

## 组合原则

1. **Facade 不隐藏组合。** `@nodebraid/core` 汇总入口，但不会隐式安装 Plugin 或 Provider。
2. **生命周期属于 Plugin Host。** Runtime Service 的可用性驱动 Activation；Owned Resource 随 Activation 逆序释放。
3. **诊断不改变控制流。** 调用失败仍向调用者 throw 或 reject；Diagnostic Event 只负责观察。
4. **实现细节留在边界内。** Cordis 类型不会越过 `@nodebraid/runtime-cordis` 的公共接口，输出与持久化策略不会进入 `@nodebraid/diagnostics`。
