# Verification report

Run: test-layers-pr-20261021 · ZWkang/nodebraid · issue #52

## Reviewed and published source

- Base: `da7f5c00004d7dc7a5b37ae5711a96ae516a9121`
- Published head: `34beb900db0d23d142b7cce97ada121630a3100c`
- Reviewed local head: `4065d3ec8fde51681288cf117f9a907d27c7b639`
- Tree: `df38347c6eb9f014bd1ea99f9985b4cb175371be`
- Complete binary patch SHA-256: `15e9bc6f2ecd5ccab93b1cb74e86055774f820c3dcfb232801503bede0ac7234`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

实现维护者在 #52 批准的最小测试分层：开发按Git变更、workspace生产/测试依赖及公共seam检查影响范围；单run拓扑构建去重且失败暴露；正式交付与CI保持全量、托管verify唯一执行；Pages复用同run文档产物。发布授权：https://github.com/ZWkang/nodebraid/issues/52#issuecomment-6314723293。同步最新main时保留其preview/报告发布及readback契约，不改变运行时公共API。

### affected-checks

真实CLI回归证明Git工作区/分支差异及生产/测试依赖和根fixture选择，所有选中层实际执行，未受影响包不执行，失败停止后续检查。

Dependencies: none

### build-once

保留干净checkout包级入口；真实diamond构建有序且每run只执行一次，共享依赖再run重新构建；完整check日志所有26个workspace各一次。

Dependencies: none

### delivery

双轴审查当前完整patch通过；verify真实全量check通过且source稳定；PR指向该tree，报告实际发布并回读当前head；保留Checks/checks、preview隔离及mainPages权限。

Dependencies: affected-checks, build-once

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

本次修改把开发检查按 workspace 生产和开发依赖选择，集中拓扑构建，并让交付与 GitHub CI 保留全量检查。审查按单次本地命令和独立 CI runner 的执行模型判断。

Standards + ponytail-review：通过，无剩余 must-fix 或 should-fix。已核对完整分支 diff、连接的 workspace manifests、测试前置、公共包 imports、构建失败传播、单次构建去重及独立 package 入口。真正 affected 执行的 fixture 覆盖构建、类型检查、包测试、根组合测试、浏览器及文档调度，并验证选中步骤失败后停止。

上轮 P1 已修复：以 Bun.Transpiler.scanImports 代替字符串正则识别模块引用，新增 fixture 字符串回归用例。已在当前真实 tests/check-affected.test.ts 上独立检查语法扫描结果，仅返回 bun:test 与 node:* 的五条 import；其中的虚构 workspace 字符串不再进入依赖或构建集合。

rebase 冲突解决保留 main 的 preview/evidence 入口、确切 PR head checkout、只读权限、凭据隔离及报告发布流程。文档部署复用同次全量检查产物，部署权限仅在 main 部署 job 开启。

范围与局限：未修改源文件，未重复执行全量或浏览器测试；执行结果由本次交付验证单独记录。本报告评审上述固定 base/head/tree/patch，其他新 main 产品改动不在本 PR 审查范围。

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

独立 Spec review：passed，0 项待修发现。

审查身份：base da7f5c00004d7dc7a5b37ae5711a96ae516a9121，head 4065d3ec8fde51681288cf117f9a907d27c7b639；已独立核对干净工作区、tree 与完整 binary patch SHA-256。规格为 Issue #52 与发布授权评论 #issuecomment-6314723293；当前适用 AGENTS 和 prepared-task 已读取。前次完整 41 文件审查后，本次逐文件核对两提交的 tree delta，确认只有 scripts/check-affected.ts 与 tests/check-affected.test.ts 改动。

最后修复正确：根测试依赖改用 Bun.Transpiler.scanImports，真实运行时模块引用与 fixture 文本分开；保留本地 fixture 递归和副作用 import。实际扫描当前全部根测试，只有 kernel-commit-preparation.test.ts 与 layout-providers.test.ts 含 workspace 运行时依赖，check-affected.test.ts 的依赖结果为空；不再将测试 manifest 或字符串中的 @nodebraid/core、@nodebraid/missing 误当作构建目标。新增真实 CLI 回归覆盖这一误选，原副作用 fixture 回归仍通过。

未改动部分继续满足规格：生产/测试依赖消费者选择、共享变更全量、单次拓扑构建去重及跨次重建、普通包依赖准备和声明/package-name 检查、Example 浏览器单次执行均保留。完整 check 与托管 verify 身份/收据协议不变。Checks/checks、只在 main 成功后以同 run 产物部署 Pages、隔离写权限及 manual 保留；上游 preview job 与报告实际发布和当前 head 回读契约未改变。

本次当前 head 实际验证：bun test tests/check-affected.test.ts，7 pass、0 fail、28 assertions；另实际扫描全部根测试的运行时依赖。未运行 full check；不沿用旧 head 的 10 tests 或 450 tests 作为本次结果。当前 head 的全量 verify、26 workspace 各一次日志与发布回读由主线程交付验证产生。未修改源文件。

## Behavior evidence

### affected-and-build-regressions

green — passed; exit 0; expected exit 0.

真实CLI验证生产与测试消费者、Git变更、根fixture导入、示例字符串不计为依赖、各选择层真实执行、失败停止，以及diamond构建有序去重和跨run重建；11个回归测试通过。

Command: `bunx --package bun@1.2.19 bun test tests/check-affected.test.ts tests/build-workspaces.test.ts`

[Original command output](logs/behavior-1.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
