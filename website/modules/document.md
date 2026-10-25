---
title: '@nodebraid/document'
description: 完整 Document 文件格式与应用拥有的业务 Data Codec。
---

# `@nodebraid/document`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界。请从 [Quick Start](/guide/quick-start) 使用源码 checkout。
:::

## 完整图文件

`serializeCanvasDocument(snapshot, codec)` 将已提交的 Canvas Snapshot 编码成文本；
`deserializeCanvasDocument(text, codec)` 返回完整且有效的 `DecodedCanvasDocument`。
两者为纯函数，不读写文件、不访问 Runtime，不修改当前画布。

版本 1 的 envelope 为 `{ type: 'nodebraid/document', version: 1, dataFormat, nodes, edges }`。
Node/Edge 的 ID、type、position、size、parentId 与 Endpoint portId 全部保留，允许空图。
不保存本地 revision、Selection、Viewport、History 或派生 Port Snapshot。
它与只表示内存子图的 [Canvas Fragment](/modules/canvas-fragment) 是不同契约。

## 应用 Data Codec

业务 data 保持 opaque。应用明确提供：

```ts
import type { CanvasDocumentDataCodec } from '@nodebraid/document';

const codec: CanvasDocumentDataCodec = {
  format: 'my-app/note-v1',
  encode(data) {
    if (typeof data !== 'string') throw new TypeError('Expected note text.');
    return data;
  },
  decode(text) {
    return text;
  },
};
```

每个实体的 `data` 在文件中是 codec 返回的字符串。应用可以自行编码日期、特殊数值或领域对象，
框架不会对 `unknown` 调用通用 JSON 转换。业务格式演进属于应用的 `format` 与 codec；
不匹配的 `dataFormat` 或文件版本在调用 decoder 前失败。codec 异常保持原身份。

## 原子恢复与新历史

调用方在文件读取及解码完成后，通过 [History](/modules/plugin-history) 的同步 Baseline Command
替换当前图。以下代码位于已经取得 Required Services 的应用中：

```ts
import { deserializeCanvasDocument, establishHistoryBaselineCommand } from '@nodebraid/core';

const document = deserializeCanvasDocument(fileText, codec);
await commands.execute(establishHistoryBaselineCommand, (transaction) => {
  const previous = kernel.read().snapshot;
  for (const edge of previous.edges) transaction.edges.remove(edge.id);
  for (const node of previous.nodes) transaction.nodes.remove(node.id);
  for (const node of document.nodes) transaction.nodes.add(node);
  for (const edge of document.edges) transaction.edges.add(edge);
});
```

一次事务失败时原图与原历史保持；成功后旧 Undo/Redo 清空，导入本身不可撤销，之后的编辑正常记录。
同内容或空图导入即使没有净变化，也会建立新 Baseline。当前 Viewport 保留，
Selection 仍按 Session 的既有规则协调：移除不存在的 ID，保留仍存在的 ID。

## 失败与验证

文件层验证 envelope、字段和数据类型，再通过独立 Kernel 的公开 Transaction 验证完整图，
包括重复 ID、geometry、Endpoint/parent 引用及 parent cycle。失败发生在修改活动画布前。
`CanvasDocumentError` 表达文件或 codec 契约错误；JSON 语法错误、Kernel 错误及应用 codec
异常保持各自原类型。没有静默修复、未知版本回退或跨版本迁移。

包测试与产物检查验证纯函数和 package-name import；History 公共组合测试验证事务与新记录起点。
[Interactive Example](/guide/interactive-example) 使用真实文件下载、重新打开、上传、继续编辑与 Undo
完成浏览器验收。文件格式不提供自动保存、数据库、云存储或协作能力。
