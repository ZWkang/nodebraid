verdict: **passed**

独立审查当前完整两文件补丁、Issue #74 全文及空讨论/外部依赖、PR75 全分页空评论/reviews/threads、独立 prepared plan、ADR0073/0077，以及 Command → Duplicate → Fragment → Kernel/Session/History 公共调用链。未发现规格遗漏、错误实现或范围扩张。

满足“Capture each incoming Node/Edge mapping collection once”：捕获后校验同一集合，按原生归一化长度读取实际索引，翻译到自有冻结数组，不读取输入 map、iterator、constructor/species。非法实际值由既有 Fragment materialization 校验拒绝并转换为 `INVALID_MATERIALIZATION`，发生于 Kernel Transaction 前；原始外部异常继续原样抛出。规范排序、同 namespace 唯一性、稀疏/继承项、Selection 更新、单 Commit 与 History replay 保留。无公共 API、依赖、cap 或 fallback 新增。

本轮实际执行 `bun test packages/plugin-duplicate-selection/tests`：34 pass、0 fail、117 assertions；包含真实 Host/Kernel/Command/Session、History 及新增 Node/Edge regressions。`git diff --check` 通过；核对 commit 列表、精确 head/tree、完整 binary patch 和干净工作树。新 main 的 Runtime/Layout 变更未修改 Duplicate/Fragment；结论未沿用旧 head 的报告或验证。

未运行 build、browser、affected/full engineering check；未验证当前待发布 head 的远端 CI、报告发布/回读、main 集成。历史 red 和旧 PR 证据不计作当前完整验收。

- base: `01c4827666dbc089a38eec61925030728411fe9d`
- head: `7eebf6bf122781d5269e683ddc84c09d39fe2d5d`
- tree: `67473f3965387e5d2f58d8aa74bb1330517becb0`
- raw binary patch SHA256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`
