# 项目工程原则

本项目维护 pstack 的全部 24 条工程原则。原则指导设计、实现和审查时的判断；现有 skills 和本地执行协议继续负责具体流程。根据当前任务的阶段和实际信号，从下表读取适用原则的完整正文；出现新信号时重新选择，不默认加载或执行全部原则。

## 使用方式

- 已确认的需求、ADR、公共契约和用户授权约束原则的应用。原则不授权扩大范围、删除必要验证、静默降级或新增流程门禁；发现真实冲突时指出具体依据，并按既有讨论流程处理。
- `grilling`、`domain-modeling` 和 `codebase-design` 使用设计相关原则；`ponytail` 使用实现相关原则；TDD、`control-nodebraid` 和 review 使用验证相关原则。迁移、并发、性能和上下文原则在相应情境出现时触发。
- 委派时把本索引和适用正文路径交给执行者；Standards review 根据具体变更选择原则，Spec review 独立对照已确认需求。原则名称不能代替具体反例、调用链或验证证据。
- 在既有任务记录中说明影响关键取舍的原则及实际证据即可，不新增逐条打卡、独立报告或重复审批。已被类型、测试或工具保证的要求沿用现有机制。

## 按场景选择

| 原则                                                                                                                         | 触发条件与应有结果                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Attack the Premise](../../.agents/skills/principle-attack-the-premise/SKILL.md)                                             | 多次修复依赖同一前提且未通过同一验收；写下并直接检验前提后再修改。             |
| [Boundary Discipline](../../.agents/skills/principle-boundary-discipline/SKILL.md)                                           | 安排验证、错误处理或 Adapter；明确每项契约的责任边界与保证。                   |
| [Build the Lever](../../.agents/skills/principle-build-the-lever/SKILL.md)                                                   | 非平凡工作需要可重跑的方法；复用或构建能减少工作、验证结果的最小工具。         |
| [Encode Lessons in Structure](../../.agents/skills/principle-encode-lessons-in-structure/SKILL.md)                           | 已证实的错误或纠正反复出现；优先修正实际执行机制，需要判断的部分保留一处指导。 |
| [Exhaust the Design Space](../../.agents/skills/principle-exhaust-the-design-space/SKILL.md)                                 | 陌生交互或架构存在实质分歧；用足以判断的候选设计或原型比较关键取舍。           |
| [Experience First](../../.agents/skills/principle-experience-first/SKILL.md)                                                 | 产品、API 或体验取舍；用调用方、最终用户和维护者的实际体验衡量方案。           |
| [Explain the Number](../../.agents/skills/principle-explain-the-number/SKILL.md)                                             | 汇报或依据性能、评测数字决策；解释测量对象、瓶颈、噪声和可能的替代原因。       |
| [Fix Root Causes](../../.agents/skills/principle-fix-root-causes/SKILL.md)                                                   | 调试缺陷；从真实复现追到首次错误决策，并证明修复覆盖原失败。                   |
| [Foundational Thinking](../../.agents/skills/principle-foundational-thinking/SKILL.md)                                       | 写逻辑、安排基础工作或处理共享状态；先理解数据形状、访问模式和真实依赖。       |
| [Guard the Context Window](../../.agents/skills/principle-guard-the-context-window/SKILL.md)                                 | 大输出、长文件、重复读取或并行分工；按需读取、提炼可追溯结论，保留未完成范围。 |
| [Laziness Protocol](../../.agents/skills/principle-laziness-protocol/SKILL.md)                                               | 评估改动、抽象和配置；复用已有能力，选择完成全部需求的最小方案。               |
| [Make Operations Idempotent](../../.agents/skills/principle-make-operations-idempotent/SKILL.md)                             | 契约要求支持重试、恢复或重复调用；依据实际状态执行并验证中断及重复语义。       |
| [Migrate Callers Then Delete Legacy APIs](../../.agents/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)   | 允许协同迁移的内部 API 更新；完成所有调用方迁移再删除旧入口。                  |
| [Minimize Reader Load](../../.agents/skills/principle-minimize-reader-load/SKILL.md)                                         | 调用链或状态难追踪；减少没有契约价值的间接层与隐含状态。                       |
| [Model the Domain](../../.agents/skills/principle-model-the-domain/SKILL.md)                                                 | 状态逻辑、重复形状假设或分支蔓延；用既有领域语言和合适结构表达真实不变量。     |
| [Never Block on the Human](../../.agents/skills/principle-never-block-on-the-human/SKILL.md)                                 | 已授权范围内的执行准备重复询问；自行查事实并推进，把真正的产品决策留给用户。   |
| [Outcome-Oriented Execution](../../.agents/skills/principle-outcome-oriented-execution/SKILL.md)                             | 已批准的分阶段重写或迁移；明确中间态并收敛到约定终态，最终完成验证。           |
| [Prove It Works](../../.agents/skills/principle-prove-it-works/SKILL.md)                                                     | 准备声明完成；直接验证当前产物和行为，区分本地结果、发布和未验证范围。         |
| [Redesign From First Principles](../../.agents/skills/principle-redesign-from-first-principles/SKILL.md)                     | 新需求影响现有设计；完整评估类型、调用方及文档影响，再选择符合契约的最小改动。 |
| [Separate Before Serializing Shared State](../../.agents/skills/principle-separate-before-serializing-shared-state/SKILL.md) | 多执行者可能写同一状态；先确认所有权，隔离独立事实并协调真正共享的权威状态。   |
| [Sequence Work into Verifiable Units](../../.agents/skills/principle-sequence-verifiable-units/SKILL.md)                     | 多步修改、迁移或交付；按可验证行为和依赖安排切片，记录预期 red 与实际 green。  |
| [Subtract Before You Add](../../.agents/skills/principle-subtract-before-you-add/SKILL.md)                                   | 新增、重构或重写前；审视范围内有证据的冗余，避免在多余结构上继续堆叠。         |
| [Test Behavior, Not Implementation](../../.agents/skills/principle-test-behavior-not-implementation/SKILL.md)                | 编写或审查测试；行为破坏时能失败，内部重构而行为不变时继续通过。               |
| [Type System Discipline](../../.agents/skills/principle-type-system-discipline/SKILL.md)                                     | 设计类型、签名或外部输入；表达真实语义和非法组合，保留边界运行时验证。         |

## 项目维护与来源

这些文件是项目维护版，固定参考
[backnotprop/pstack@e44668c2](https://github.com/backnotprop/pstack/tree/e44668c2aad92eacf4e84df47984121fefb11b82/skills)，
每条正文附其原始文件链接。全部 `principle-*` 的上游版权和许可见
[PSTACK-LICENSE](../../.agents/skills/PSTACK-LICENSE)。只安装在本项目 `.agents/skills/`，不引入 `poteto-mode`、全局配置或另一套调度。

维护时比较原原则目的与本项目的真实案例，选择性吸收上游变更；不要用新原文覆盖本地适配。主要适配包括：

- 上下文管理不添加文件数、轮次或任务范围上限；工具化优先复用，不以新增文件作为应用原则的证明。
- 原型按真实设计不确定性触发；第一性原理重审不自动授权重写，减法不扩大为无关清理。
- 单调用方或单实现不足以否定公共 seam；类型不取代 [ADR-0026](../adr/0026-validate-layout-contracts-at-their-ownership-boundaries.md) 中的各层验证责任。
- 幂等性按具体操作契约判断；业务 Command 的再次执行可以产生新效果，清理失败遵守已有生命周期契约。
- 内部 API 的协同迁移不授权删除外部公开契约；自主执行继续服从既有授权与 [pr-risk](../../.agents/skills/pr-risk/SKILL.md) 的分级审阅和合并职责。

新增或调整原则时，同步对应触发入口和 `agents:check` 的完整性清单。检查文件和链接只能证明指导可读取；是否改善 Agent 行为，要通过实际任务证据或独立场景评估判断。
