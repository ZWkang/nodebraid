# Spec review — Issue #114

Verdict: **passed**. 未发现本 Issue 的验收缺漏、错误实现或范围扩张。

- Base: `3ebb9bf51df19825ce98b3371075885dfa496fdf`
- Head: `0399f1d4cdafa6590d188056b4da19de29af60ab`
- Tree: `02ef1145bade98ea58045242438cb2dce93c2d4f`
- Complete binary patch SHA256: `3b832f733f227c091bf0a65732ac5be270d953b3a4c4914ad043c3a4df8952fc`

已独立读取 Issue114 全文/全部零评论、prepared request/plan、完整两文件补丁、436行新增回归及原始 red/green。依据当前 AGENTS/CONTEXT/code-review、ADR0072/0014/0029/0012/0084/0085，追踪 Keyboard Delete→共享 Command→Kernel closure/Session pruning/History 及 Document Baseline。

Issue 要求 “capture input.selection once” 并使用同一自有值完成全部验证与删除。helper 一次读取 Selection、nodeIds/edgeIds roots，各数组先一次原生数值转换长度，再惰性 Get 真实索引并验证非空字符串。后续 canonicalIds 只接收私有数组，应用 iterator/every/map/constructor/species 不再选择 Selection IDs；仍排序去重，不增加输入顺序或唯一性限制。根/集合/index 改值及 evidence 回调修改旧数组，都不能把首目标 a 换成 b，保留未删 b 和 live b Selection。

Issue 要求 “nodeIds-before-edgeIds-before-evidence” 和原始异常/原生长度语义。源码保留该短路顺序、getter receiver、继承/non-enumerable、falsey thrown-value；稀疏/非法索引在 evidence 前拒绝，fraction/empty/BigInt/Symbol/Infinity 首条失败仍按 native lazy 模式处理，无 bulk allocation、cap、fallback 或 accessor ban。空 Selection 继续先验证 evidence，再返回 null。

#112 的首 evidence 仍只读取一次并保留原 Snapshot/实体引用；没有克隆 evidence 或遍历/冻结 data。Node/Edge identity、ABA、incident closure、无关 Commit、图失败原子性、metadata、Session 与 History Undo/Redo 路径不变。范围仅本地 Selection 捕获，Snapshot 内部集合及其他 pending 接口未修改；没有新增公开 API/依赖或改变共享 validator/Kernel/Session/Gesture 策略。

独立核验 HEAD/clean、parent、canonical patch/hash 与保存记录一致；当前 dist/delete-selection-command.js 含两个新 helper，SHA 已记录。独立执行 `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`：**251 pass /1730 assertions，exit0**；`git diff --check BASE...HEAD` exit0。原始输出见 `spec-commands.log`，已回读。

未独立执行构建、类型检查、typed five-mode compiled probe、affected、浏览器或正式 full check；远端发布/current-head CI、完整报告/media readback、合并及 main 全 Issue 验收未由本审查验证。公共 Renderer seam 不证明原生浏览器输入。
