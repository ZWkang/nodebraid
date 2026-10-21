本次修改把开发检查按 workspace 生产和开发依赖选择，集中拓扑构建，并让交付与 GitHub CI 保留全量检查。审查按单次本地命令和独立 CI runner 的执行模型判断。

Standards + ponytail-review：通过，无剩余 must-fix 或 should-fix。已核对完整分支 diff、连接的 workspace manifests、测试前置、公共包 imports、构建失败传播、单次构建去重及独立 package 入口。真正 affected 执行的 fixture 覆盖构建、类型检查、包测试、根组合测试、浏览器及文档调度，并验证选中步骤失败后停止。

上轮 P1 已修复：以 Bun.Transpiler.scanImports 代替字符串正则识别模块引用，新增 fixture 字符串回归用例。已在当前真实 tests/check-affected.test.ts 上独立检查语法扫描结果，仅返回 bun:test 与 node:* 的五条 import；其中的虚构 workspace 字符串不再进入依赖或构建集合。

rebase 冲突解决保留 main 的 preview/evidence 入口、确切 PR head checkout、只读权限、凭据隔离及报告发布流程。文档部署复用同次全量检查产物，部署权限仅在 main 部署 job 开启。

范围与局限：未修改源文件，未重复执行全量或浏览器测试；执行结果由本次交付验证单独记录。本报告评审上述固定 base/head/tree/patch，其他新 main 产品改动不在本 PR 审查范围。