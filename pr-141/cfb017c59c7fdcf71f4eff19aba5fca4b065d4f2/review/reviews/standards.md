# Standards + ponytail-review

What this change does: 在 Runtime 清理诊断树的既有“成员未变”判定中使用 Object.is，使原样保留的 NaN 不再触发重建 AggregateError。原始 disposal rejection、真正的诊断去重和生命周期流程保持原义。

**Verdict: passed。发现0项；没有必须修复项或有具体反例的 Fowler smell。**

## 固定身份与范围

- Base / expectedParent：`447d7ae999959888b2dd3aefeaef1fa1784dcb7d`（分别保存）。
- Head：`f5df3997555bf3470eababb626c0b87c453720c1`；tree：`4591a2f466a7435ca4e4cd27aa948f695b929b02`。
- 完整 binary patch SHA256：`953ff2e94631ef139d4a4d0c99f435a498681385d41be888daaa881b10d8176a`。
- 实际 changedFiles：`packages/runtime-cordis/src/host-diagnostics.ts`、`packages/runtime-cordis/tests/diagnostic-cleanup.test.ts`，无 rename。

已完整读取两路径及 PluginActivation→Installation→Host 清理、cleanup-errors、HostDiagnostics 选择/发射、raw DiagnosticEvent 与安全 attributes 的调用链；也读取完整既有 cleanup/inspection 测试、Runtime 契约和 README。判断依据为当前 AGENTS/CONTEXT、ponytail full/review、pr-risk、[Issue140](https://github.com/ZWkang/nodebraid/issues/140)、ADR0004/0028/0029及 Boundary Discipline、Fix Root Causes、Test Behavior、Type System、Idempotence、Prove It Works。

## 独立判断

- 首个错误决定确在共享判定：NaN 经递归原样返回，却因 === 不自等而导致不必要的重建。单行 Object.is 修在负责这个保证的边界；未改发射点、caller rejection、集合遍历、异常传播或包装层次。
- 真正已诊断的引用仍由 WeakSet 过滤；长度/成员比较仍决定何时重建必要的父聚合。没有通过无条件返回原错误来取消去重，也没有把 unknown raw error 错套有限数值 attributes/details 的约束。
- 新增公开回归观察真实 Host/Installation 的返回结果与 Sink 事件：无过滤 NaN 原聚合身份、Host 混合 NaN/-0/Infinity/-Infinity/undefined/Error、真实已诊断成员过滤后保留未变的 NaN 子聚合。逆序清理、缓存 outcome、disposed 状态、caller 数组/值未改与旧稀疏/继承/循环/原生读取失败回归均保留。
- 以进程内 Host 的现有错误树为负载边界，本改动没有新增遍历、集合或共享状态；每个既有比较仅换用标准库同值比较。未声称资源极限、任意调度或性能提升，也没有新增抽象、依赖、cap、retry、fallback、flattening 或错误值禁令。

## 本次实际证据与归属

实读 `tdd/primary-red/receipt.json`、`combined.log` 和对应 green：完全相同 test bytes SHA `83dbd208fe68f3159f8d789a5e0353c04029236df1234afa8e924a7af6338413` 在生产未改时1 fail/4 assertions，最小修复后1 pass/8 assertions。随后 dirty 阶段 related Runtime＋Diagnostics 319/2374、严格 typecheck0 的完整 patch 与本 head 相同；这不是正式 full。

当前 `affected-receipt.json` 绑定本 head/tree/patch，实际 exit0/stable，范围为17个受影响 package、两项根组合测试、React/Examples/SVG browser 和 docs；原 stdout/stderr hash 已逐字节核对。该检查构建本次 Runtime/Diagnostics 所需产物及所选消费者，不推断所有无关产物都重新构建。

`public-controls/receipts.json` 和原始 observations 记录同字节八控制程序 SHA `6650d16ccf78006be316e10435d51cdd8754a41e5248aad92da5e2e02b11a91b` 在本 head 新 strict compile0、原生 Bun0、8/8。两项原 Sink-on NaN 红条件现在保留原聚合引用；其余 rejection/cleanup/cache 检查、uncaught0、unhandled0及 listener 移除均成立。Sink-off 的空事件仅证明普通诊断禁用，不拿不存在的载荷宣称身份已验。核对653份观察到的公共产物 byte/hash 与执行前一致，Runtime 的实际 JS 已含本次 Object.is；未复用旧 main 的6/8红结果为新 green。

上述测试/编译/affected 均由执行器实际运行；本独立 reviewer 新执行测试、编译、build、browser、Git/GitHub均为 **0**。原红、后续 green、旧失败和原计划报告保持原身份。

## 风险与门禁

**Risk: medium / quick-human。** 公开 Runtime src 改变清理诊断的错误对象身份选择，路径最低 medium；单行改动和绿检查不能降为 low。依据为上述完整两路径、调用链和本次固定身份的公开红绿/去重/affected 证据。回滚可用正常后续提交撤销该单行实现与对应回归；无持久化数据迁移或不可逆写入，但会重新引入 NaN 清理诊断身份缺陷，调用者拒绝语义不变。

Not checked: 正式 full 尚待双轴通过后的 canonical verify；远端 source/CI、当前 head 全文报告与动态六场景媒体发布回读、所需人工审阅/merge及实际 main 整项验收未由本轴认证。后续门禁是待执行交付阶段，不是本次代码缺陷。
