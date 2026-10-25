# Spec review — Issue #112

Verdict: **passed**. 未发现本 Issue 的验收遗漏、错误实现或范围扩张。

- Base: `ce74d89ba882374c16174cff1f20a3e6418acc02`
- Head: `911cdd05dfb1959c871472ceed11b339fe822b5e`
- Tree: `71cbf9c8c0a4c1739fa2385105397d0a5b10e997`
- Complete binary patch SHA256: `41d2c0e8a58bffd5411f10c6c8115c32aacf42b9c4b959b6be5ee2bd4c48eed3`

已独立读取 Issue112 全文/全部零评论、prepared request/plan、完整两文件补丁、唯一提交、原始 red/green 和 Selection fixture 修正记录。依据当前 AGENTS/CONTEXT/code-review、ADR0072/0012/0014/0029/0084/0085，追踪 Runtime Delete 调用、Kernel identity/Transaction、Session pruning、History 和 Document Baseline。

Issue 要求 “Capture input.evidence once … after input/Selection shape validation”。helper 保留既有输入/Selection shape 短路后正常读取 evidence，验证首个 Snapshot 并直接返回同一引用；Node/Edge maps、显式目标、incident closure 及事务内预检都使用它，后续没有 input.evidence Get。没有克隆 Snapshot 实体、深遍历或冻结 data，也没有新增全局 revision 锁，因此保留精确目标 identity 与 unrelated-Commit 语义。

S1→S3 的同值 ABA、显式/incident Edge 重建及新增 incident Edge 均以首证据预检；稳定当前与首有效后续抛错的输入仍可删除。原 getter receiver、继承/non-enumerable、非 Error thrown-value、pre-abort、malformed Selection-before-evidence、首 malformed evidence 和空 Selection 验证/no-op 路径保持。事务仍先完整预检，再规范去重删除 Edge/Node；metadata、图失败原子性、Session/History 和 Undo/Redo 数据引用未改。fixture 修正恢复了 ABA 前的真实 Selection，没有弱化断言。

范围仅 evidence 根；Selection 与内层数组解析保持原样，未声称其他 pending 输入已修复。未改变 Kernel、其他 Command、公开 API、策略或新增 cap/retry/fallback。

独立确认 HEAD/工作树干净、canonical patch/hash 与 inspection/complete.patch 一致，并读取当前 dist/delete-selection-command.js 确认新 helper 及 handler 调用，SHA 已记录。独立执行 `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`：**207 pass /1014 assertions，exit0**；`git diff --check BASE...HEAD` exit0。完整输出见 `spec-commands.log`，已回读。

未独立执行构建、类型检查、compiled ABA probe、affected、浏览器或正式 full check；远端发布/current-head CI、完整报告/media readback、合并和 main 全 Issue 验收仍未由本审查验证。公共 Renderer seam 不作为原生浏览器证明。
