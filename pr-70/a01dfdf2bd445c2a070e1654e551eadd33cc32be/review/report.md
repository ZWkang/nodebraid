# Verification report

Run: 82dac695-82ea-471d-a85a-76bf46efa964 · ZWkang/nodebraid · issue #69

## Reviewed and published source

- Base: `d88f2e09e66119a9873a3ee150da637b1fbf8bb8`
- Published head: `a01dfdf2bd445c2a070e1654e551eadd33cc32be`
- Reviewed local head: `b8a9c219119e39a5e68b08324f29c259c6eb676e`
- Tree: `178815c324bc75a2a6ffc6f299900cedc32a65c4`
- Complete binary patch SHA-256: `710989693c8b28eef75d1cc05ee532644b72e81722e7e529fdd67c3ab21ef396`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

1c91ef3b1199b0c2b208116eb26b373aae97053503b4f0c2fdec4e2d914ed1c1

### integrate-current-main

Merge fetched maind88 before first publication; preserve exact original Runtime patch and baseline14 red evidence. Investigate actual browser failure; no old verification is relabelled.

Dependencies: none

### cleanup-error-preservation

Public real Host lifecycle red/green: Runtime diagnostic traversal never invokes supplied collection hooks, original owned-resource error remains in disposal rejection, exactly one error-level cleanup event; source objects unchanged and disposal cached.

Dependencies: integrate-current-main

### traversal-compatibility

Own indexed aggregate traversal preserves ordering, sparse/inherited members, nested/circular and already-diagnosed error filtering, native indexed read failures and malformed-collection visible failure; original package-name probe passes.

Dependencies: cleanup-error-preservation

### delivery

Actual affected checks, independent Standards+ponytail-review and Spec; sole full gate agents:run verify; exact remote source/tree/first-parent, actual published-head report/preview hashes, current CI/feedback and automatic evidence publication readback; human final review/merge.

Dependencies: traversal-compatibility

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review — Issue #69 完整补丁复审

Verdict: passed

- Base: `d88f2e09e66119a9873a3ee150da637b1fbf8bb8`
- Head: `b8a9c219119e39a5e68b08324f29c259c6eb676e`
- Tree: `178815c324bc75a2a6ffc6f299900cedc32a65c4`
- Binary patch SHA-256: `710989693c8b28eef75d1cc05ee532644b72e81722e7e529fdd67c3ab21ef396`

已重新读取完整三文件补丁，检查 HostDiagnostics 自有遍历、Activation 清理缓存、Installation 全部 terminal 分支、Host/依赖清理及 Cordis 错误展开路径。

## 硬规范及原 P2 处置

未发现当前补丁违反硬规范。原异步 setup P2 已修复：setup 在 abort 后 resolve/reject 的两条路径均不再把调用方清理 AggregateError 抛给 Cordis，而由现有 public dispose 在 Fiber 结束后重新读取 Activation 的同一缓存拒绝。错误未被吞掉，也没有提前重复入账。

新增真实 Host 回归验证两种结算、原始错误成员、清理一次、缓存 Promise 与单一失败事件；现有依赖清理、逆序资源释放、Child、故障观察及错误身份回归保持通过。符合 ADR0028 的观察/传播分离、ADR0004 的完整清理聚合，以及 Fix Root Causes、Boundary Discipline、Test Behavior, Not Implementation。

自有数组遍历继续保持原生长度转换、稀疏/继承成员和已诊断错误过滤；没有新增 accessor 禁令或 fallback。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。改动复用既有 Activation/Installation 缓存与聚合责任，没有新增框架或公共 seam；按单 Host 的已约定负载，修复最小且完整。

## 实际检查及限制

本轮 `bun test packages/runtime-cordis/tests`：100 pass、463 assertions（Bun 1.4.2）。原样重放保留的公共 stdin 探针，exit 0，输出：
`{"hookReads":0,"replacedByHook":false,"status":"disposed","cachedPromise":true,"disposeEvents":1}`。

`git diff --check` 通过。旧 head 的失败报告/探针保持原身份；本报告只绑定上述新提交。未运行构建、full check、浏览器、远端发布或当前 head CI；不把仍在执行的其他检查计作通过。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已对新 head 完整三文件补丁重新独立审查，核对 Issue69 原验收、prepared task、ADR0028/0030、真实 Host/Installation/Activation/Cordis 调用链；未发现新增验收遗漏、范围扩张或错误实现。原 7989243 报告保留在 review-history，未将其通过结果换绑。

两处早期 setup 清理 catch 仅在终态保留 Activation 已缓存的拒绝；当前 Activation 引用仍在，公开 dispose 等 Cordis 结算后读取同一清理 Promise 并聚合拒绝，因此没有早期重复 push、重复清理或静默成功。setup 被中止后 resolve/reject 两条新回归均覆盖；依赖丢失分支、取消识别与普通业务 setup 错误处理未改变。完整补丁同时保留自有索引遍历、原始错误引用、一次错误事件、缓存及 Host/Child/依赖错误顺序和去重。

实际执行：`bun test packages/runtime-cordis/tests/diagnostic-cleanup.test.ts packages/runtime-cordis/tests/diagnostics.test.ts packages/runtime-cordis/tests/index.test.ts`，98 pass、0 fail、449 assertions。已核读 early-setup-red.log，两个旧实现失败均为 forEach hook 被调用的行为断言。`git diff --check` 通过，工作树干净。

未执行构建、affected 全链路、full verify、浏览器、远端发布、当前 head CI 或报告发布回读；不会把运行中的 affected-after-review 计为通过。Issue68 不属于本补丁。仅写本报告，历史报告与源码未改。

- base: `d88f2e09e66119a9873a3ee150da637b1fbf8bb8`
- head: `b8a9c219119e39a5e68b08324f29c259c6eb676e`
- tree: `178815c324bc75a2a6ffc6f299900cedc32a65c4`
- raw binary patch SHA256: `710989693c8b28eef75d1cc05ee532644b72e81722e7e529fdd67c3ab21ef396`


## Behavior evidence

### original-public-package-red

red — passed; exit 1; expected exit 1.

At original base14, a real package-name Host cleanup loses its owned AggregateError through a supplied map getter and emits no cleanup error event. Original expected hookReads0 assertion fails.

Command: `bun runtime-cleanup-probe.ts at original base14d10d0`

[Original command output](logs/behavior-1.log)

### public-regression-red

red — passed; exit 1; expected exit 1.

Original public Host regression fails because supplied map getter executes. This result belongs to the original pre-fix source, not current head.

Command: `bun test packages/runtime-cordis/tests/diagnostic-cleanup.test.ts before implementation`

[Original command output](logs/behavior-2.log)

### cordis-boundary-red

red — passed; exit 1; expected exit 1.

Before owner-boundary fix, public forEach hook and cyclic AggregateError regressions fail through real Cordis traversal; logs retained.

Command: `bun test packages/runtime-cordis/tests/diagnostic-cleanup.test.ts --test-name-pattern forEach|circular (before boundary fix)`

[Original command output](logs/behavior-3.log)

### public-package-green

green — passed; exit 0; expected exit 0.

Current Runtime package-name Host probe: hooks0, original retained, one cleanup failure event, one cleanup call and disposed state.

Command: `bun original runtime-cleanup-probe.ts against current package build`

[Original command output](logs/behavior-4.log)

### current-public-runtime-suite

green — passed; exit 0; expected exit 0.

After the independent review correction: 100 Runtime tests /463 assertions pass, including early setup resolve/reject cleanup and dependency de-duplication.

Command: `bun test packages/runtime-cordis/tests`

[Original command output](logs/behavior-5.log)

### historical-development-browser-failure

check — failed; exit 1; expected exit 0.

Historical prior-base affected attempt failed: Renderer page-global function missing. Unchanged targeted whole Renderer rerun later passed. No root cause established or retries/waits/test changes added; fresh current-head affected/full checks are separate.

Command: `bun run check:affected --base14d10d0 (historical final Runtime working patch)`

[Original command output](logs/behavior-6.log)

### unchanged-renderer-investigation

check — passed; exit 0; expected exit 0.

Whole Renderer browser suite re-executed at unchanged Runtime patch and exited0; observed failure did not reproduce. This does not erase the preceding failure.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser:self`

[Original command output](logs/behavior-7.log)

### current-head-affected-check

check — passed; exit 0; expected exit 0.

After independent review corrections, the final Runtime patch passes all actually selected package/consumer/root/browser/docs checks, including the complete Renderer suite. Historical earlier failure is retained separately.

Command: `bun run check:affected --base d88f2e09e66119a9873a3ee150da637b1fbf8bb8`

[Original command output](logs/behavior-8.log)

### early-setup-review-regression-red

red — passed; exit 1; expected exit 1.

At fixed7989243 before correcting the independent Standards P2, public aborted Setup resolve/reject tests both fail via Cordis hooks; original log is retained.

Command: `bun test packages/runtime-cordis/tests/diagnostic-cleanup.test.ts --test-name-pattern aborted setup (before early-path fix)`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
