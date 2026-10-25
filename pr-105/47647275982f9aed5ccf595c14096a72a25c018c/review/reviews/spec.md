# Spec review — Issue #104 / PR #105 final synchronization

Verdict: **passed**. 未发现功能验收遗漏、错误实现或范围扩张。

- Base: `58889a92b7cc7a3c953efe115ff6d8664924e094`
- Head: `d27ee24eaec5add059be9d413b4fcdf347256ab4`
- Tree: `abd83973678bfdf50b852efdb8c4a77067a75e4b`
- Complete binary patch SHA256: `ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4`

已独立重读 Issue104 全文/零评论、prepared request/同步计划、完整两文件补丁及465行回归；核验实际提交和有序父节点 `26e6d48c8d43494db72d20b1dc4d919b06a28f04`、上述 base。依据当前 AGENTS/CONTEXT/code-review、ADR0014/0029/0012、0084/0085，追踪 Move→Kernel/History，以及当前 Create Edge、Document restore 和 Example materializer。

Issue 要求 “Use exactly those owned values for every existing validation, stale check and write”。moves、native length、索引、ID/Point/scalar 一次捕获后，所有阶段复用本地值；真实 stale/sparse 条目不能被 caller traversal 隐藏。shape 仍整批先于 unique/order/finite，保持 ID→base x/y→position x/y 短路、原 receiver/继承属性/外部 thrown-value。长度只转换一次且惰性访问，保留 BigInt/Symbol、Infinity 首条失败等原生行为，没有预分配、cap、排序修复或 fallback。

一次同步 Transaction 先检查全部来源，再只替换当前 Node.position；type/size/parent/opaque data、metadata、no-op identity 和失败原子性保持。新 History 按实际操作及 Commit identity 识别 Baseline，恢复后的 Move 仍是普通可撤销编辑。Document codec 没有进入 Move 数据路径；新 Create Edge 捕获位于独立 handler。相对当前 base 未扩张 Kernel、其他 Command、Gesture/Shortcut、公开 API 或依赖。

依赖稳定后独立执行：`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts` **191 pass /916 assertions，exit0**，包含额外 Core roundtrip 的1 test/5 assertions。`git diff --check BASE...HEAD` exit0；HEAD/tree、完整 canonical patch/hash 与 inspection/complete.patch 一致。原始输出见 `spec-commands.log`，已回读。

未独立运行构建、类型检查、compiled probe、affected、浏览器或完整工程检查；五个 native preview、远端发布/current-head CI、完整报告/media readback、合并及 main 全 Issue 验收未由本审查验证。旧 head 的报告与结果未换绑。
