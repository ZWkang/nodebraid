What this change does: 在既有 Issue 完整读取和回读边界保存本地 Markdown/JSON 阅读副本与内容摘要历史，并将 archive-issue 接入当前工作流。

**Standards：passed。硬性规范违规 0 项；判断性 smell 0 项。**

审查覆盖相对当前 main 的完整 9 文件 patch，依据 AGENTS、Issue tracker、讨论与本地协议、工程原则、code-review、ponytail-review 和 Fowler baseline。已追踪 CLI 参数、JSON 读取、归档输入验证、共享摘要函数以及历史/current 文件写入；按协议的单一归档写入者审查。

完整正文及评论保留；身份和评论完整性在写入前验证；读取时间和评论顺序不制造重复历史，已有历史排他创建且不覆盖，错误沿真实 CLI 传播。原归档实现与测试 blob 保持不变，没有新增 GitHub 回写、资格判断或调度行为。

已核对三处机械冲突解法：AGENTS 和 README 同时保留 archive/reconcile 文档；local-agent.ts 同时保留两个命令及 baseRefName 校验。当前 main 的交付对账、retarget 复验、公开内容规则、工程原则和 Layout 功能说明均完整保留。

最终提交的 tree 与已审阅功能树一致；重新计算完整 patch 摘要并验证父链，原 PR head 仍为祖先。

固定身份：

- Base：`374c3bafcd4bbd95a25206084b4471195c36167a`
- Head：`6bfa38704e6e6106d98347d0ed26bb3473b83365`
- Tree：`1aea51ad5efa52a6c2962783d610fc6e49a7d55f`
- Binary patch SHA-256：`0f4fe3f362811ccc0e19e97617cc9439cd8b59fa7db4e0d9e27696be1e3bf86e`
- Parents：当前 main `374c3bafcd4bbd95a25206084b4471195c36167a`、原 PR head `27786926d39baad5c2a6d4ae0a8945ae753b6328`。

Verdict: Ship（代码审查通过）。
Not checked: 本次未运行测试或全量工程检查，未核验远端更新、CI 或证据发布。原审查及测试保留原提交身份，不作为新 head 的执行结果；并发归档不在本审查验证范围。
