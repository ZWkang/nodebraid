What this change does: 用一个 spec Issue 和一个 main PR 交付新需求，本地 ticket 复用现有计划与证据，并区分合并前 ready、合并后验收和 Issue 关闭。

**Standards：passed。硬性规范违规 0 项；启发式 smell 0 项。**

本次复审覆盖完整 12 文件 patch；逐项审查新增 8 文件关闭规则，另外 4 文件与上次已完整审阅的 blob 相同。已重新计算实际 head/tree/binary patch 身份，依据当前 AGENTS、Issue tracker、本地协议、相关 skills、ponytail-review、Fowler baseline 和适用工程原则检查一致性。

默认 PR 模板现在使用 `Refs #N`。合并后仍有验收时，同一 Issue 保持开放并在验收后显式关闭；只有合并本身是最后剩余验收条件且关闭已获授权，才允许 `Fixes #N`。各入口一致要求核对 PR、提交消息和自动关闭的 Development 关联，避免仅修改正文后仍提前关闭。

此前 ready 的顺序修复仍完整保留：合并前步骤和当前 head 检查、审查、报告决定 ready；依赖 main 的步骤按保存的 acceptance 保持 pending，关闭才核对真实 main 集成、全部 ticket 证据和剩余验收。frontier 仍只提供依赖候选，没有把协调者核对描述为自动门禁。

单 Issue/单 PR、本地计划恢复、隔离协作者汇入同一交付及历史链保留相互一致。生产运行时代码无 diff，两个真实 CLI 用例保持不变；没有新增状态字段、存储、调度、审批或凭据路径，也没有削弱错误暴露和源码身份要求。

固定身份：

- Base：`56ccf1267941b3034f1a8204cb554358c2a4fff1`
- Head：`1dad0a6abb2fd6ee73925be0db015dcd5cc5ff24`
- Tree：`a146ee3b034d9b0900e38738ab6bd4ef3e785d75`
- Binary patch SHA-256：`f8eda9ca8d3bd177e0752f9c181e0f8fdffc7464e87e3fd2328e9ae67966be15`

Verdict: Ship（代码审查通过）。
Not checked: 本次未运行测试、全量检查或发布。已核对旧验证记录仍绑定 `7fd2f1af23c0537629425835a1d82cf3252aaf4a`、exit 0、source stable；它不证明当前 head 已通过全量检查。
