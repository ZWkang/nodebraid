# Verification report

Run: 03ba2f7f-67ad-42e1-bc8b-34483e8baef0 · ZWkang/nodebraid · issue #76

## Reviewed and published source

- Review base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Independently prepared append parent: `39b7e07a0ff883a93244940b9e0e259146e7d447`
- Published head: `e5456c5fb2cdd57af4ba48a3a7ec54d190bb8011`
- Reviewed local head: `39b7e07a0ff883a93244940b9e0e259146e7d447`
- Tree: `3728e2d3d620dcfe42761661152ef50e7c798b00`
- Complete binary patch SHA-256: `c358889e56b38986cf451533c571b52c6ec4d24286a7c3d60289652a09e3bbea`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Revalidate the complete Session input ownership repair against current main after an external source rebase; retain accepted Viewport and Selection values, exact public contracts and actual current-head evidence. Source: https://github.com/ZWkang/nodebraid/issues/76

### current-source-and-public-checks

Refresh canonical Issue, complete comments, blockers, existing PR/head/tree and target main. Retain external rebase history; run public Session tests and current consumers without borrowing old verification identity.

Dependencies: none

### independent-review-and-full-check

Independently review full main710 to fixed39b patch in Standards+ponytail-review and Spec; versioned main710 verify performs actual full check with stable head/tree/patch.

Dependencies: current-source-and-public-checks

### current-publication-and-report

Preserve independently saved current source parent39b. If source has not moved, append the verified exact tree on the same branch, validate actual remote parent/tree, and require fresh CI, complete feedback, full report/media publication and immutable readback.

Dependencies: independent-review-and-full-check

### main-integration-acceptance

Actual main integration and whole-Issue deployed public acceptance remain pending before authorized closure.

Dependencies: current-publication-and-report

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review — Issue #76 / PR #77 新身份复审

Verdict: passed

- Base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Head: `39b7e07a0ff883a93244940b9e0e259146e7d447`
- Tree: `3728e2d3d620dcfe42761661152ef50e7c798b00`
- Binary patch SHA-256: `c358889e56b38986cf451533c571b52c6ec4d24286a7c3d60289652a09e3bbea`

本轮独立核验新来源、完整两文件补丁、当前 AGENTS/领域/讨论规范、原则及相关调用链。保存的 Issue 评论/阻塞和 PR 评论/review/thread 均为空。结论绑定上述新基线与提交。

## 硬规范

未发现违反。`packages/plugin-session/src/session-plugin.ts` 中 Viewport 的校验、负零规范化和发布共用一次捕获的 x/y/zoom，保留有限坐标及正 zoom、不 clamp 的 ADR0018 契约。

Selection 一次捕获字段和自有索引序列，再复用原 validator、Set 规范化与 Kernel membership。native keys 不调用输入 iterator/constructor，也不按不可信长度预分配；Infinity 首项原始错误、读取先后、稀疏/继承索引和非数组诊断回归通过。未知实体仍整次拒绝，符合 ADR0017。

已追踪 Session FIFO/reconciliation、Interaction 调用、Renderer 订阅和 React Snapshot 消费。等价输入 identity、通知轮一致性、订阅者隔离和 disposal 责任保持，符合 ADR0022。公共真实 Host/Kernel/Session 回归没有替换内部 Services，符合 Boundary Discipline、Fix Root Causes、Test Behavior, Not Implementation 和 Prove It Works。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。捕获与验证集中在已有 Session 边界，复用既有 Kernel native-index 模式及发布机制。按单 Canvas Host 的输入负载，复制为线性，既有排序保持；没有新 API、依赖、cap、retry 或 fallback。

## 当前提交实际检查及限制

本轮 `bun test packages/plugin-session/tests`：34 pass、116 assertions（Bun 1.4.2），包含原错误身份及 FIFO 回归。完整范围 `git diff --check` 通过，工作树干净。

未执行 build、check:affected、仓库 full check、浏览器、真实 GitHub 发布、报告上传或当前 head CI；没有将旧身份的结果重标为当前验证。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已在 rebase 后新身份上独立审查完整两文件补丁，重读本轮 Issue76 全文、空评论/blockers、PR77 正文及空 comments/reviews/threads、独立 prepared plan、当前 AGENTS/CONTEXT/讨论协议与 ADR0017/0018/0022/0035；未发现明确验收遗漏、错误实现或范围扩张。

Viewport 已知字段各捕获一次，验证、负零归一化及发布复用同值；Selection 使用一次捕获的自有索引集合完成验证、Kernel membership、去重排序及冻结发布。原生 length descriptor 懒遍历不调用来方集合 hooks、不预分配，Infinity Proxy 的索引0异常保持原对象身份和旧 Snapshot。空 Selection、规范顺序、等价输入 no-op/Snapshot identity、结构化错误聚合与读取顺序、正有限 zoom/no-clamp、FIFO/reconciliation、subscriber 隔离及生命周期均保留，没有新增 API、cap、fallback 或 accessor 禁令。

实际在 head39b 执行：`bun test packages/plugin-session/tests`，34 pass、0 fail、116 assertions；涵盖真实 Host 的字段/索引 capture、隐藏未知 ID、继承项/长度转换、Infinity 异常身份及既有 Session 契约。完整 diff/hash/提交列表与 `git diff --check` 已核验，工作树干净。

未运行构建、check:affected、full check/verify、浏览器或远端写入；未验证当前 head CI、完整报告/媒体发布回读或 main 集成。PR 既有工程/媒体文字与旧报告不作为本轮全量验收证据，本次结论仅来自新身份上的审查和定向执行。

- base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- head: `39b7e07a0ff883a93244940b9e0e259146e7d447`
- tree: `3728e2d3d620dcfe42761661152ef50e7c798b00`
- raw binary patch SHA256: `c358889e56b38986cf451533c571b52c6ec4d24286a7c3d60289652a09e3bbea`


## Behavior evidence

### historical-session-red

red — passed; exit 1; expected exit 1.

Original main99 public compiled Host/Kernel/Session probe: invalid frozen Viewport, changed Selection read, hidden unknown indexed entity. Historical identity retained; no old verification attached to current39b.

Command: `bun session-input-repro.ts (original run20261021T190719-discovery, main99)`

[Original command output](logs/behavior-1.log)

### current-session-public-regressions

green — passed; exit 0; expected exit 0.

Current39b/tree3728 Session public tests after external rebase: 34 pass,116 assertions, preserving native indexed semantics and original failures.

Command: `bun test packages/plugin-session/tests`

[Original command output](logs/behavior-2.log)

### current-session-consumers

green — passed; exit 0; expected exit 0.

Current Session, Kernel service, Renderer and Interaction public suites:89 pass,389 assertions.

Command: `bun test packages/plugin-session/tests packages/plugin-kernel/tests packages/plugin-renderer/tests packages/plugin-interaction/tests`

[Original command output](logs/behavior-3.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
