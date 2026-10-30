# Spec review

**Verdict: passed. Findings: 0.**

Reviewed head: ece568a07a2f56ae25d6daa63d9f16d88108a5af; tree: 2e6095cd9265a816d6e25dd8c13fe65e2d48794d; binary patch: 6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b.

对照 [Issue #142](https://github.com/ZWkang/nodebraid/issues/142) 与[已接受范围](https://github.com/ZWkang/nodebraid/issues/142#issuecomment-6517283433)，未发现遗漏、越界实现或违反规格的行为。

- Scope 1–2：提交后的 Query 使用本次已封闭 Draft 的索引；后续事务仍创建独立索引。Snapshot 数组仅在对应 touched-ID 集合为空时复用，值相等 replace 不会错误复用旧实体引用。
- Scope 3–4：公开 exports、Map 复制、最终图校验及错误传播路径未变。新的 committed Query 没有复用已关闭的 Transaction Query；发布仍在 metadata 读取成功之后，净零仍保留原 View。
- getter 重入记账修复符合规格中的现有重入语义要求。字段捕获后读取当前 Draft 实体，消除旧关系残留；没有新增重入禁令或失败降级。新增公共测试覆盖 Node/Edge 重入、原始异常、回滚、历史索引和双向 replay。

独立运行三个相关测试文件：26 passed、0 failed、296 assertions；日志为 reviews/spec-check.log。另核对 Kernel 295 tests 与 affected-2 成功回执。原性能 harness 与完整矩阵执行器字节一致；60 次优化版运行的 1,800 个正式样本、72 次配对运行的 2,160 个样本及构建产物前后哈希均有效。

性能证据支持提交路径改善，不支持所有路径改善：50k 净零主对照慢 8–13%，追加六对结果有快有慢，原因未定位；必须保留此限制。采样比例不能当作精确阶段时间。

**Risk: medium / quick-human.** 变更影响公共 Kernel 的索引所有权和跨 revision 引用复用，packages/*/src 路径最低为 medium。重点人工审阅重入记账、未触碰判定与历史 View 隔离。

**Rollback:** revert ece568a，恢复每次提交重建索引和 Snapshot 数组；同时撤回此次重入索引修复。没有数据格式迁移或不可逆操作。

本审查未执行正式全仓 verify、远端发布或主线验收；这些仍是后续交付条件。未读取 Standards 结论。
