# Spec review — Issue #106 / PR #107 synchronization

Verdict: **passed**. 未发现功能验收遗漏、错误实现或范围扩张；不代表完整工程验收通过。

- Base: `aba0795079c6e3182d14b698f212c437092ed844`
- Head: `4ecbeb33f7753079be127693fb3c7d2fc55d0e6e`
- Tree: `170f9438e1204675c9973a945cb84416c1d454fc`
- Complete binary patch SHA256: `6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5`

已独立重读 Issue106 全文及全部零评论、prepared request/同步计划和空反馈/依赖记录，核验完整两文件 diff、513行公共回归、实际 fix/merge 提交。merge 有序父节点为 `edf10e2d670ce98f65fb766c7d4b3f3abe0c887a`、上述 base。另读已接受 Issue108、ADR0084/0085、新 CONTEXT、History Baseline、Document codec 和 Example ID materializer；依据当前 AGENTS/code-review、ADR0069/0012/0029 追踪兼容性。

Issue106 要求 “Validate and apply the same owned structural values”。Edge/source/target、ID/type、Endpoint/Anchor fields 一次捕获；shape、角色、Endpoint/self-loop、live Node、动态 Port、重复 ID 与最终写入复用该值。guard 顺序和空 Endpoint/Anchor Port 的既有区别保持，原 getter receiver、继承/non-enumerable 属性及原始 thrown-value 无包装。

data 仍按要求 “only at the existing Kernel Writer phase”。存在性检查在 Edge shape 阶段，实际值由私有 getter 在所有 semantic guards 后以原 Edge receiver 读取一次，不遍历/冻结业务 data。新 Node-copy 修复没有改变 Edge Writer；metadata、单 Edge Commit、Undo/Redo 与失败原子性保持，没有额外 API、策略、Registry、cap 或 fallback。

新 History 以操作及 Commit identity 识别 Baseline；Create Edge 仍产生普通 Commit，后续编辑正常记录。Document 使用显式应用 codec，未向 Command 增加 JSON 数据政策；Example 分配 ID 时查询当前图，避免恢复文件中的已有 ID 冲突。相对本轮 base 没有扩张到其他 Command 或文档实现。

独立实际命令：`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts` **153 pass /745 assertions，exit0**。其中额外 Core roundtrip 文件贡献1 test/5 assertions；协调器三 package 命令的152/740是另一次执行，分别记录。`git diff --check BASE...HEAD` exit0；HEAD/tree、canonical patch/hash 与保存文件一致。原始独立输出保存在 `spec-commands.log`。

工程上下文更新：原 affected SVG 失败 `__nodebraidRendererSvgRuntimeInteractionProjection is not a function` 保留于 affected.log；协调器随后运行未修改的完整 SVG suite及整套 affected-after-svg-investigation.log 均exit0，包含SVG、Example Document和docs。调查记录确认相关bundle字节一致，未改源码、断言或harness，也未增加fallback；环境/CLI触发根因尚未证明。这些浏览器结果由协调器执行，本审查未独立运行构建、类型检查、affected、compiled probe、浏览器或完整检查。五个preview、远端CI/发布/readback、合并及main验收仍未由本审查验证。更新前完整报告保留在 spec-before-browser-status-update.md。
