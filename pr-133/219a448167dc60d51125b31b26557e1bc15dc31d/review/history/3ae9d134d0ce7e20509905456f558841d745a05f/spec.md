verdict: changes-requested

base: 6fd2d016f6330cc422508b3e51229bea4be2cce0
head: 3ae9d134d0ce7e20509905456f558841d745a05f
tree: 25e17466d4f7a48b540be9711e9dabdb6fe87b24
binary patch SHA256: 0beba21066485b57839adada0ee99e442cea14635f5fcd30cc8c84ba9fd7bf9a
taskDigest: 931f3d5bf15180095ee77655c8da3308ac84817af0cf9e85a5726b0e509a25d3

独立读取 [Issue132](https://github.com/ZWkang/nodebraid/issues/132) 全文/全部评论；最终读回2026-10-27 07:55:06 UTC，open、bug/ready-for-agent，评论0、request未变。完整四文件、208输入、Geometry/Viewport/WorldRect契约及acceptor→DOM Journal→Effective State/Hit/Input调用链已审查，依据指定main规范与ADR0054/0059/0062/0063。实际补丁与归档一致。

P2 — packages/renderer-svg/src/interaction-projection.ts:120–125：违反 “validate and project those same captured values”。验证按for-of顺序保存capturedPositions，却用应用map回调的index取缓存。canonical[a,b]、全部finite的合法候选，只让map传入互换index且仍输出[a,b]，就使a携带b的basePosition/position、b携带a的几何。本人使用真实Kernel baseline及规范Port/Session值的纯acceptor探针已重现：普通map控制正确；自定义map后a期望30/40却收到150/160，严格断言actualExit1。该探针是内部边界观察，不冒称公共Renderer/browser。另读取相同entry的公共SVG对照：base2/2通过、current2/2位置交换（非本人执行）。应按已验证Node/candidate identity关联捕获几何，不依赖调用方callback index，也不新增array限制。

其余字段捕获、有限值/正zoom/非负尺寸及浅metadata规则未发现独立缺口；HitResult.worldPoint补全符合公开契约，不能把fixture初次失败当产品修复。无另行scope creep finding。

本人执行 `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`：296 pass、0 fail、2196 assertions，21文件，exit0；diff-check通过，前后HEAD/tree/patch/clean一致。公共Bun不覆盖上述回归；完整探针代码/actualExit1及Bun原始输出在spec-tests.log。

未本人执行build/typecheck/affected/browser/full/原12或远端CI/发布/媒体/merge/main验收；上述失败必须修复后重新审查。

risk: {"level": "medium", "rationale": "公共SVG Projection几何所有权影响显示及Effective State/Hit/Input，命中public-src medium下限；已确证Node Drag跨ID错绑，必须先修复，测试通过不能降低风险或覆盖失败verdict。", "evidence": "完整四文件/208场景和ADR0054/0059/0062/0063调用链独立审查；本人公共Bun296tests/2196assertions通过，但纯acceptor严格几何关联探针actualExit1；另读取相同public SVG entry在base2/2pass、current2/2fail。main6fd2 risk blob596298db784c4f3424968cd05a3aca4a6471b1b3已核对。", "rollback": "普通回退3ae9d134d0ce7e20509905456f558841d745a05f整项四文件或未来实际映射发布改动，再按既有Renderer reset/dispose生命周期重建投影；无schema/数据迁移，回退会恢复原继承几何缺失问题，代码回退不撤销已执行应用Command。"}
