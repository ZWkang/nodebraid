# Spec review — Issue #98

Verdict: **passed**. 旧 P2 已完整修正；未发现其余验收遗漏、生产实现错误或范围扩张。

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `cd18e1f097b6fb38cadd432bfa82931029eed58c`
- Tree: `d2d7e8ceefafaec243840ac318ea699b73a92dc9`
- Complete binary patch SHA256: `50f0622fe0fe29d74744f01660840841c10ff8d59ccc7fa34fd8d42c0131dc69`

已重新独立核验完整两文件补丁、两个提交、inspection/complete.patch、原始 Issue98 和 prepared plan。原始 comments/blockers 为空；新增评论 [6359256086](https://github.com/ZWkang/nodebraid/issues/98#issuecomment-6359256086) 已完整读取，它修正异步接口合规证据，未改变验收。依据当前 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0019/0021/0024/0025/0026/0029、双语 Runtime 文档及 Layout/Command/Kernel/History 调用链审查。

Issue 要求 “Capture the concrete Engine when createLayoutPlugin() is called” 和 “Use the same public Engine receiver”。factory 捕获一次 options.engine，Plugin name、能力校验、计算以及后续 Activation 均闭包引用同一对象；成员调用 engine.compute 保留 receiver。两种外层替换时机均不能选择第二 Engine，既有 unsupported 检查仍位于计算之前。

两个直接 Engine fixture 现为 async compute，符合公开 Promise<LayoutProposal> 契约；第二提交仅增加两个 async，不弱化 this、调用次数、实际 Kernel 位置、一次 getter 读取及第二 Activation 的断言。原 options getter 失败仍通过捕获值后 toBe 验证原对象身份。生产修复与上一审查完全相同；直接/helper 支持、计算异常、full/incremental/Fixed Node/self-loop 验证、取消、Proposal/stale、单 Commit metadata、net-zero 和 cleanup 路径保持。未扩张 options.command、Engine 内部或算法范围，未新增 API、Registry、禁令或 fallback。

实际独立检查：base/head/tree、完整 binary patch/hash 与新保存文件一致；第二提交生产 diff 为空；git diff --check BASE...HEAD exit 0。本轮**未独立执行测试、构建、affected、浏览器或完整检查**。当前 head 发布/CI、native Layout 截图与动作、完整报告/media readback、人工合并及 main 验收未由本审查验证；历史失败和旧 head 结果不换绑。
