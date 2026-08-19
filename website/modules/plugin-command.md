---
title: '@cflow/plugin-command'
description: Activation-scoped 的强类型 Command 注册、执行、取消与清理能力。
---

# `@cflow/plugin-command`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

直接把行为写成回调，会让身份、输入输出类型、取消和资源归属散落在调用方。`@cflow/plugin-command` 提供一条 CFlow-owned Runtime seam：Feature Plugin 注册强类型 Command，其他 Consumer 使用同一个 token 执行，而所有 registration 与 in-flight execution 都归当前 Activation 管理。

Command Service 只负责执行协议，不拥有 Kernel、Session 或领域状态，也不会成为动态 Service locator。

## 何时使用

- 你要让多个入口共享同一个应用行为；
- 你需要编译期关联 Command 输入和输出类型；
- 你的 handler 可能异步执行，并需要 caller cancellation；
- 你要让 Command 注册和正在执行的任务随 Plugin Activation 一起释放；
- 你在实现 Layout、History 或其他需要稳定行为入口的 Feature Plugin。

## 提供的能力

- `defineCommand<Input, Output>(id)`：创建 runtime-unique、强类型且冻结的 Command token；
- `CommandService.register()`：为精确 token 注册一个 handler；
- `CommandService.execute()`：用统一 Promise seam 执行同步或异步 handler；
- `CommandExecutionContext`：提供诊断 `commandId` 与该次调用独立的 `AbortSignal`；
- `CommandRegistration.dispose()`：终止查找、取消并等待该 registration 的全部执行；
- `CommandError`：用稳定 domain 与 code 暴露结构失败。

Command 的字符串 ID 只用于诊断和阻止歧义注册。执行查找使用 `defineCommand()` 返回的对象 identity；重新创建同名 token 不能冒充已经注册的 Command。

## 依赖与组合

该 package 依赖 `@cflow/runtime-cordis` 的 Plugin Host seam 与 `@cflow/diagnostics` 的结构化错误，不依赖 Kernel、Session、History 或 `@cflow/core`。

一个 Feature Plugin 应通过自己的 Required Service bindings 获取依赖，并拥有 registration：

```ts
import { commandPlugin, commandService, defineCommand, type CommandService } from '@cflow/plugin-command';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

const greet = defineCommand<string, string>('message.greet');
let commands: CommandService | undefined;

const feature = definePlugin({
  requires: { commands: commandService },
  setup(context) {
    const registration = context.services.commands.register(greet, async (name, execution) => {
      execution.signal.throwIfAborted();
      await Promise.resolve();
      execution.signal.throwIfAborted();
      return `Hello, ${name}`;
    });
    context.own(() => registration.dispose());
  },
});

const consumer = definePlugin({
  requires: { commands: commandService },
  setup(context) {
    commands = context.services.commands;
  },
});

const host = createPluginHost();
const commandInstallation = host.install(commandPlugin);
const featureInstallation = host.install(feature);
const consumerInstallation = host.install(consumer);
await Promise.all([
  commandInstallation.whenActive(),
  featureInstallation.whenActive(),
  consumerInstallation.whenActive(),
]);
if (!commands) throw new Error('Expected Command Service to activate.');

try {
  console.log(await commands.execute(greet, 'CFlow'));
} finally {
  await host.dispose();
}
```

实际应用通常会在 Consumer Activation 中保存或适配 `CommandService`，而不是把它放到全局变量。上例重点展示 Required Service、Activation waiting 与 Host cleanup 的边界。

## 公共入口

```ts
import {
  commandPlugin,
  commandService,
  defineCommand,
  CommandError,
  type Command,
  type CommandExecutionContext,
  type CommandExecutionOptions,
  type CommandHandler,
  type CommandRegistration,
  type CommandService,
} from '@cflow/plugin-command';
```

这些入口也由 `@cflow/core` 重导出。

## 生命周期与错误语义

每次 `commandPlugin` Activation 创建一份空 `CommandService`。需要 Command Service 的 Installation 在 Provider 出现前保持 pending；`whenActive()` 等待真实 Activation，不返回占位 Service。

`execute()` 总是返回 Promise。同步 throw、异步 rejection 和成功值保留原始身份，不被包装为伪造结果。caller signal 只传播到这一轮 handler；取消是协作式的，handler 必须观察 signal，并决定最终 resolve 或 reject。

`CommandRegistration.dispose()` 具有以下保证：

1. Command 立即从执行查找中消失；
2. 所有已开始 handler 的 signal 都被 abort；
3. disposal 等待这些 handler 真正 settle；
4. token 与 ID 在等待期间继续保留，避免新旧 handler 重叠；
5. 重复或从 abort listener 重入调用，都会返回同一 Promise。

Provider deactivation 与 `host.dispose()` 对残留 registration 执行同样的清理。若 handler 忽略 signal 且永不 settle，Host 清理会保持 pending；实现没有 timeout、强制成功或吞错 fallback。

| Code                         | 触发条件                                                     |
| ---------------------------- | ------------------------------------------------------------ |
| `INVALID_COMMAND`            | ID 为空、ID 类型无效，或 token 不是由 `defineCommand()` 创建 |
| `COMMAND_ALREADY_REGISTERED` | token 或诊断 ID 仍被当前 Activation 保留                     |
| `COMMAND_NOT_FOUND`          | 精确 token 未注册，或 registration 正在释放                  |
| `SERVICE_DISPOSED`           | 旧 Command Service 所属 Activation 已结束                    |

定义和注册失败同步 throw；执行失败 reject Promise。handler 自己的错误不会改写成 `CommandError`。

## 限制与非目标

- 不注入 Kernel、Session 或任意动态依赖；
- 不提供 middleware、优先级、权限、队列、串行化、重试或去重；
- 不自动把 Command 变成可撤销行为；History 只观察真实 Commit；
- 不强制 handler 遇到 abort 时返回哪一种结果；
- 不提供全局 Command Registry 或跨 Plugin Host 查找。

## 验证依据

package 行为测试通过真实 Plugin Host 覆盖空 ID、伪造 token、同 ID 冲突、同步与异步结果、handler 原始错误、caller cancellation 隔离、in-flight disposal、重入幂等 cleanup、Provider deactivation、旧 Service 失效与重新 Activation。类型测试锁定 Command 输入和输出的 invariant 关系；声明检查锁定不泄漏 Cordis 与 core 类型。
