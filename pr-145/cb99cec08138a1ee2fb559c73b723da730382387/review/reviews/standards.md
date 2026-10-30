# Standards / ponytail-review

变更作用：复用已经封闭的 Draft 关系索引与完全未写入集合的冻结快照，并保持外部 getter 在同一事务内重入时的索引一致性。本次审查重新检查了这些所有权规则与新 main 的 Examples 调用方之间的兼容性。

固定身份：base 772aedcbcbd288a96c1f79cda6c8096c27763b56；head a13082d93b93d731b08f1f316aaa562df64aa3ee；tree 8f2a86b1bb51f3d0ffdb5462eb296f1c68d02a6a；binary patch SHA-256 6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b。

**发现：0 项。** 依据仍为 AGENTS、CONTRIBUTING、CONTEXT、ADR-0009/0010/0011/0012/0029，以及所有权、边界、行为测试、读取负担和性能证据原则。未发现新增的标准违反或可操作的代码异味。

独立核对合并有序父提交：第一父为原发布 f19f15f31d525063946317a373ee1c43c45b79d6，第二父为新 main 772aedc。相对新 main 的完整差异仍是相同五个 Kernel 文件，patch 字节身份不变。上游仅改八个 Examples 文件，未改 Kernel 契约或工程规则。

追踪了提取后的 projectNodeEditor、reconcileNodeDraft、applyNodeDraft 和 viewport helpers。前者继续使用精确 Node identity、revision-bound Query 与 Command 后的当前读取；后者只读节点几何。它们不依赖未写入集合每次产生新数组，复用条件仍以 touched ID 为准，值相等替换不会混用旧 Snapshot 与新 Query 引用。Writer 关闭、旧 View 隔离、完整校验及原错误传播保持。

验证证据：读取当前 head 的 Kernel 构建、Kernel+Examples 测试（320 pass、0 fail、1,909 assertions）和 example:check 的类型、构建、真实浏览器成功日志。未重复执行相同测试。另独立重算 102 份当前 Kernel/Diagnostics 源码和构建文件，与原 ece568a 测量副本逐字节一致；原性能结果通过此产物映射沿用，不宣称旧测量或旧全量检查在新 head 执行。

性能限制保留：主对照中 50k 净零路径慢 8–13%，六对补测有快有慢，未证明稳定无回退；主要提交路径的收益不能推广到所有路径或浏览器帧率。

**风险：medium；路由：quick-human。** 权威图索引与不可变快照的内部所有权变化，且公共框架源码路径下限为 medium。需重点人工审阅重入、引用一致性及净零性能结果。

**回滚：**将本 PR 五个 Kernel 文件恢复至当前 main 版本，保留 PR146 的 Examples 变更；无持久格式变更、数据迁移或不可逆副作用。

**未检查：**新基线正式 full verify、追加发布、当前远端 CI 与 main 验收仍独立待执行；本轴没有重跑浏览器或性能负载。

Verdict: passed。Standards 0 项发现。
