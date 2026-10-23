# Spec review — Issue #104

Verdict: **passed**. 未发现规格遗漏、错误实现或范围扩张。

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `ecfd1b0b21617717012ad3070d836c3d3b20c542`
- Tree: `68258a4c6774fd95d27cd7fb44bdfb3fea049b38`
- Complete binary patch SHA256: `ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4`

已独立读取 Issue104 全文及全部零评论、input/prepared plan、fixture-correction；原始 request 与 Issue 正文一致。核验完整两文件补丁、唯一提交、inspection/complete.patch，完整审阅新增465行公共回归。依据当前 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0014/0029，追踪 Interaction 注册 → Command handler → Kernel Transaction/History，以及既有 Session/Kernel native-index 模式。

Issue 要求 “Use exactly those owned values for every existing validation, stale check and write”。handler 只读取一次 moves、length、各索引及 Node ID/Point/scalar；能力边界内复制到私有值后，unique/canonical/finite、全量 stale preflight 和写入均复用该集合。真实索引中的 stale b 不再被应用 iterator 隐藏，所有 stale 检查完成后才开始替换 Node。

Issue 要求保留 “whole-input shape validation before unique/canonical/finite checks” 与 “native length coercion and lazy first-entry failure”。capture 维持 Node ID → basePosition x/y → position x/y 的 shape 短路，完整捕获后再执行既有值校验；数值长度只转换一次，借自有 length descriptor 惰性遍历，不预分配、不读取应用 traversal/map/constructor/species。原始 getter/非 Error 失败无包装，pre-abort 仍先于输入读取，空/重复/乱序/非有限/缺失/过期错误保持。

仅 shared Move Nodes handler 改变；当前 Node 非位置字段及 opaque data 从 live Node 保留，metadata、no-op identity、单 Transaction、History undo/redo 路径不变。未修改 Kernel、其他 Command、Gesture/Shortcut、公开 API、依赖或新增 cap/fallback。

实际独立执行：`bun test packages/plugin-interaction/tests packages/plugin-history/tests` **99 pass /479 assertions，exit0**；`git diff --check BASE...HEAD` exit0；HEAD/tree、完整 patch/hash 与记录一致。原始输出见 `spec-commands.log`。应用 Renderer Provider 是公共 backend seam，此结果不证明原生浏览器输入。

未独立运行构建、类型检查、compiled probe、affected、浏览器或完整工程检查；远端发布/current-head CI、完整报告/media、人工合并及 main 全 Issue 验收未由本审查验证。
