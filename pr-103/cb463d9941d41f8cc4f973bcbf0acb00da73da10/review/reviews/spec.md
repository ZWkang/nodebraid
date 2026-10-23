# Spec review — Issue #102 / PR #103 synchronization

Verdict: **passed**. 未发现验收缺漏、错误实现或未请求的范围扩张。

- Base: `e21c917b170b37ff60418d76a0bbcc65b8799d17`
- Head: `723b81124050862940abcb8feb729e0c8baa7737`
- Tree: `67f3b505dae06ba0effc38ba653ea8c757d6f2a0`
- Complete binary patch SHA256: `7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2`

已独立重读完整 Issue102、全部零评论、prepared request/同步计划及空反馈/依赖记录；request 与正文一致。完整核验两文件 diff、230行新增公共回归及 fix/merge 提交。实际 merge 第一父为 `6f7b8247208a1decb943cd2c4ff8d39d38aa8707`，第二父为上述 main base。依据当前 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0010/0011/0012/0029，追踪 Writer、Draft/索引、最终图验证、KernelPlugin 与 History。

Issue 要求 “Capture … Position reference, optional Size reference and optional parent ID once” 并在 “existing final graph validation boundary” 拒绝无效首值。新 helper 按 type → Position/x/y → Size/width/height → parent → data 顺序一次读取，复制并冻结已捕获几何壳，undefined 可选字段继续省略。首次非法值不会被后来读取替换，仍可在 Transaction 中显式修复，不引入 eager graph validation。

Issue 要求保留原始失败和 “no partial Writer/Draft/index change”。closed/duplicate/missing/ID-mismatch guards 仍先执行，freeze 成功后才更新 Map、关系索引和 touched IDs。回归验证原 receiver、继承/non-enumerable getter、每个失败阶段及非 Error 值、caught failure 后继续写入和 exact View；opaque data 仍最后读取、保持原引用且不深冻结。Edge copying、ID capture、replay preflight、canonical/net-zero/metadata 与历史 evidence 路径保持。

新 main 的 Runtime descriptor、Layout Engine 和 Preset policy 修复未改变 Kernel 接口或图验证责任；本 PR 相对新 base 仍仅修共享 Node copy owner，没有新增 API、策略、依赖、cap 或 fallback。

依赖稳定后独立执行当前 head：`bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests` **249 pass /1276 assertions，exit0**；`git diff --check BASE...HEAD` exit0。HEAD/tree、canonical patch/hash 与 inspection/complete.patch 一致。原始输出见同目录 `spec-commands.log`，已回读。

未独立运行构建、类型检查、compiled18-case probe、affected、浏览器或完整工程检查；当前 head 远端发布/CI、报告/media readback、合并和 main 全 Issue 验收未由本审查验证。历史 head 的结果未换绑。
