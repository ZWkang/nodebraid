# Verification report

Run: 1d0a9721-7b38-4c34-adf2-d19ebeddc9bb · ZWkang/nodebraid · issue #78

## Reviewed and published source

- Review base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Independently prepared append parent: `181faea507e1c83bd26e8496036d5cdc3285043b`
- Published head: `fe0aa3726ccaf08aa84150e9315eab3b1d74460c`
- Reviewed local head: `67ac72702760081093265d585cbe66f880dc9fa9`
- Tree: `4b17d60e90aaf7e20e0237ddf0c37e320ae15747`
- Complete binary patch SHA-256: `109bbee66116db007cb9e6bc86769dfebef001cc3f100c9b15a9bfcb0ea356de`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Retain the accepted Layout Request mode and Layout Proposal values through validation and immutable publication; synchronize current main and continue Issue78/PR79 with exact new-head verification.

### sync-and-inspect-source

Retain actual source/request and remote head181; clean mechanical main710 synchronization is inspected, only complete Layout Request/Proposal patch is reviewed against main710. Preserve all superseded receipts as history.

Dependencies: none

### public-contract-checks

Re-run public API/real Dagre/ELK/Runtime/History tests, API types and compiled Request/Proposal probes at the synchronized source; preserve prior behavioral reds without rebinding their verification identities.

Dependencies: sync-and-inspect-source

### independent-review-and-full-check

Both independent Standards+ponytail-review and Spec review main710 to the new exact head/tree/patch. Main710 agents:run verify executes the full engineering check after both pass; an affected plan that selects full is deferred to this formal check.

Dependencies: public-contract-checks

### append-and-current-head-acceptance

Append to PR79 with first parent181 and an additional main710 parent, preserving independently saved main ancestry. Actual new head CI, complete feedback, report/preview upload and immutable byte readback pass.

Dependencies: independent-review-and-full-check

### main-integration-acceptance

Human final review/main integration and final public Request/Proposal acceptance remain pending prerequisites for authorized Issue78 closure.

Dependencies: append-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review — Issue #78 / PR #79 新 main 基线复审

Verdict: passed

- Base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Head: `67ac72702760081093265d585cbe66f880dc9fa9`
- Tree: `4b17d60e90aaf7e20e0237ddf0c37e320ae15747`
- Binary patch SHA-256: `109bbee66116db007cb9e6bc86769dfebef001cc3f100c9b15a9bfcb0ea356de`

已独立核验新源记录、Issue 全文/空评论、准备任务、合并双父及完整五文件补丁。新 main 的规范更新已核对；Layout、关联 Runtime 和 Provider 实现未因 main 同步改变。本轮使用当前 head 的实际测试结果。

## 硬规范

未发现违反。`layout-input.ts` 的 mode 在校验、诊断和发布间共用一次捕获值；非法类型/模式和原始读取异常先于 Fixed Node 处理，后者不能改写已接受模式，符合 ADR0026 的 Request 边界。

`proposal-validation.ts` 保留一次原始 positions 序列及 sourceRevision、ID、position、坐标读取。精确覆盖、规范排序、Fixed Node 检查和冻结均使用自有已验证值，符合 ADR0021/0026。revision、重复/未知 ID、x/y 的错误优先级及原始失败身份保持。

已重新追踪 Input → Engine → shared validator → freeze → Runtime/Kernel/History。必要的 Runtime 重验、取消、实时 stale 检查及单次 Transaction 未删除；测试复用真实 Dagre/ELK、Host、Command、Kernel、Session 与 History，符合 Boundary Discipline、Fix Root Causes 和 Test Behavior, Not Implementation。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。字段捕获位于既有负责模块，坐标 helper 复用同一检查并保留短路。没有额外公共 seam、cap、retry 或 fallback；按单 Canvas 布局负载，额外存储线性，排序复杂度保持。当前实现符合最小充分改动与可验证切片原则。

## 当前提交实际检查及限制

本轮 Layout API、Runtime、真实 Dagre/ELK 及根 Runtime/History 测试：62 pass、208 assertions（Bun 1.4.2）。完整范围 `git diff --check` 通过，工作树干净。

未执行构建、仓库 full check、浏览器、远端发布、实时 PR 反馈查询或当前 head CI。旧基线报告保持历史身份；本报告不把定向通过或计划选择 full 当作全量验收成功。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已在新 main710 基线上独立重审完整五文件补丁、Issue78 更新全文/空讨论、独立 prepared plan、ADR0021/0026及 Request/Proposal→Engine→Runtime→Kernel/History 调用链；未发现明确验收遗漏、范围扩张或错误实现。

本地合并父链包含 main710，combined diff 为空；main99→main710 没有 package/Layout 改动，合并前后产品文件字节一致。新基线完整产品 patch 仍仅实现既有 Request/Proposal 值归属修复。

mode 捕获后用于验证、受限诊断与冻结 Input，后续 Fixed Node 处理不能替换已接受值；Proposal 的 revision、单次 positions 序列与 id/point/坐标复用自有值。exact coverage、finite、Fixed Node、规范顺序/冻结、原异常与错误先后保持。Runtime 二次验证、stale/cancellation、Provider 错误及单 Commit/History/no-op/UndoRedo 边界完整，没有新增 API、cap 或 fallback。

实际在新 head 执行：`bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests tests/layout-providers.test.ts`，62 pass、0 fail、208 assertions。真实 Dagre/ELK、getter 输入和 Runtime/History 组合均通过。另完成新身份/hash、完整 diff、父关系、产品文件等同比较和 `git diff --check`；工作树干净。结论来自本轮复审和执行，旧报告/原始 red 不换绑。

未执行工程构建、类型检查、浏览器、full verify、远端追加发布、当前 head CI/完整反馈或报告/媒体发布回读；待执行的 full affected 范围不计通过。远端第一父/主分支祖先与最终 main 集成仍须实际验收。

- base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- head: `67ac72702760081093265d585cbe66f880dc9fa9`
- tree: `4b17d60e90aaf7e20e0237ddf0c37e320ae15747`
- raw binary patch SHA256: `109bbee66116db007cb9e6bc86769dfebef001cc3f100c9b15a9bfcb0ea356de`


## Behavior evidence

### original-main-proposal-red

red — passed; exit 1; expected exit 1.

Historical original compiled public Engine and validator reproduction at original main99: non-finite accepted coordinate, incomplete coverage and changed revision. Original source identity is historical; this is not a verification of current source.

Command: `bun layout-proposal-repro.ts (original discovery run 20261021T201012-discovery; main99)`

[Original command output](logs/behavior-1.log)

### original-main-request-red

red — passed; exit 1; expected exit 1.

Historical original compiled Request mode probe at main99 publishes invalid frozen mode after repeated reads. Source provenance remains in the original discovery run.

Command: `bun layout-request-mode-repro.ts (original discovery run 20261021T204642-discovery; main99)`

[Original command output](logs/behavior-2.log)

### current-related-public-tests

green — passed; exit 0; expected exit 0.

Current synchronized local head67/main710: Layout API, Runtime, real Dagre/ELK and Runtime/History composition, 62 passed /208 assertions.

Command: `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-3.log)

### current-layout-types

check — passed; exit 0; expected exit 0.

Current synchronized Layout API typecheck, no public type contract changes.

Command: `bun run --filter '@nodebraid/layout-api' typecheck:self`

[Original command output](logs/behavior-4.log)

### current-compiled-public-probes

green — passed; exit 0; expected exit 0.

Current67/tree4b public compiled Request full/incremental retain one accepted mode read; Proposal retains finite x10, complete one-Node coverage and source revision1. Header records current source and historical original baseline99 distinctly.

Command: `bun fixed-request-mode-probe.ts && bun fixed-proposal-probe.ts`

[Original command output](logs/behavior-5.log)

### first-full-check-browser-failure

check — failed; exit 1; expected exit 0.

Original real full verify failed at SVG fixture missing global during viewport pan/wheel, after 614 Bun tests passed. Source stable. The cause of the disappeared global was not established and no source/assertion/environment change was made. This failure remains visible alongside a new complete verification attempt.

Command: `agents:run verify (attempt1, exact head67/tree4b; current main710 executor)`

[Original command output](logs/behavior-6.log)

### isolated-renderer-browser-diagnostic

check — passed; exit 0; expected exit 0.

The complete unchanged SVG browser suite passed independently on current67 after the full-check failure. This establishes the fresh observed pass; it does not prove a root cause or a browser code repair.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser:self`

[Original command output](logs/behavior-7.log)

### recorded-browser-investigation

check — passed; exit 0; expected exit 0.

Original failed receipt/log preserved; current retry is another actual full check with an independent log, no fallback or weakening.

Command: `Inspect original full-check output, exact source and isolated suite; retain diagnosis limitations`

[Original command output](logs/behavior-8.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
