# Standards review — Issue #108

What this change does: 完整 Document 通过应用明确提供的 Data Codec 保存为文件，恢复通过一次 Kernel Transaction 建立新的 History Baseline；Example 提供真实文件下载、导入与错误展示。

## Source identity

- Base: `a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688`
- Head: `427f91fe383bf619feea2ceeac50646e0e452b58`
- Tree: `992d05a73fc309a7b06c6f7d07bc7dc2700f6081`
- Binary diff SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`
- Reviewed command: `git diff --binary a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688...427f91fe383bf619feea2ceeac50646e0e452b58`

## Findings

硬性 Standards 违反：0；有具体反例的 ponytail/smell finding：0。

重新核对完整功能的 Document → Kernel 校验、Example → Command → History → Kernel 提交与有序通知链，并对照 AGENTS、CONTEXT、ADR-0011/0012/0013/0015/0016/0084/0085 及适用工程原则。文件验证与业务 codec、图一致性、History 记录边界各有明确所有者；没有新增静默降级或推测性框架。

本次重点重评 main 的 `freezeCanvasNode` 修复：position、size、parentId 单次捕获仍在 Draft 写入前完成，抛错不会留下部分实体。Document 先捕获自己的输入，交给 Kernel 的值是已稳定的普通字段；解码后的冻结结构和 opaque data 引用继续保留。History Baseline callback 使用修复后的同一 writer，失败仍不会提交或清空历史；净零、重入 Commit、后续 Undo/Redo 与依赖释放语义不受字段读取修复影响。按单个交互式 Canvas Runtime 的实际负载评估，未发现需删除的抽象或可复现的性能问题。

已读取刷新后的完整 Issue #108 与接受范围评论 `6365145631`；GitHub 实时讨论刷新由协调者完成。

## Verification

在该 head 执行：

`bun test packages/kernel/tests/node-owned-values.test.ts packages/document/tests packages/plugin-history/tests packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts`

结果：137 pass、0 fail，9 个文件；日志为 `standards-targeted.log`。其中包含新增 Kernel 回归及完整 Document/History 测试。确认当前 Kernel 依赖产物包含新字段捕获实现；本审查未并行重建产物。

固定区间 `git diff --check` 通过，工作区干净，实际 HEAD/tree/binary patch hash 与上述身份一致。

Verdict: passed.

Not checked: 未重跑浏览器、全量工程验证或远端发布回读；本审查结论不替代当前 head 的正式交付验证。
