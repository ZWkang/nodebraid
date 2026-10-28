Issue136 oracle 审计：**需要纠正验收 oracle；不是需求语义或公开契约变化**。本报告不构成实现代码审查通过。

1. 应保留一个 `AggregateError([originalProxy, inspectionFailure])` 作为现有 command Fault 的错误值。Issue136 第2条明确要求实际 inspection 失败与原 rejection 同时显式可见；ADR0029 要求并列失败以 `AggregateError.errors` 保留且不 flatten。ADR0028 要求边界一次观察。为旧 matcher 拆成两个无关联 Fault 会丢失聚合关系、增加观察次数，不能作为修复。

2. 原程序的 `faults.some(f => Object.is(f.error, failure))` 要求原 rejection 必须位于 Fault 根；它没有验证第二个实际失败。这比第2条“保留原引用”更强，也与其 compound 情况冲突。普通单错误 Shortcut 和 direct Command 仍应保留根身份；只有实际发生分类失败的路径需要 compound 根。

3. 第4条“same source/values/assertions”及计划 `affected-and-independent-review` 的“original byte-identical compiled3 new green”必须澄清。原入口 SHA256 `1e759b79df9d0528d6c9ac636e3f03134173a2a57fa462b1d71ed4b62e4d1f2a`、原 red 与修复后原样运行 exit1 全部保留。已读实际新输出：两个控制通过；Proxy 路径 Fault1、unhandled0、Binding/reservation/Host/Renderer 均完成，旧根比较仍 false。不得标记原程序 green，亦不能把该 false 改写为 true。

更正后的独立程序应显式记录旧 direct-root 比较，同时仅在分类失败路径增加严格断言：**恰好一个**稳定 command Fault，框架 compound 的自有 `errors` 数据成员恰好两个，slot0 与原 Proxy、slot1 与实际 inspection 抛值分别 `Object.is` 相同，关联 Fault/event/command ID/scope 保持。使用先比较原值、再检查框架自有数据描述符的观察方法，不能为匹配再次触发原 Proxy 的 prototype/getter。普通与 direct 控制保留原根身份断言，所有 lifecycle、Disposition、unhandled0、清理及 reservation 断言不减弱；禁止用任意递归“包含原值”替代精确 slots 或用伪造 collector。

应先在同一 Issue 公开澄清并完整读回/归档，再以修订请求与本地计划独立 prepare 新 run；旧 prepared task、旧测试、旧失败及全部回执保持原状。新 oracle 单独 strict compile、emit、执行并绑定实际源码身份，不能预报通过。

本轴只读了原程序、完整 Issue、ADR0028/0029、公共 DiagnosticFault 契约、当前最小 diff 和已保存运行记录；未运行程序/测试/build，未改代码或 GitHub。当前记录属于 base `fe94ea93…` 的 dirty patch `2e311f5cf8d0028a02e07d4eeb30fae2830280c9411abcc7609cce1b3013dcab`，不是新提交验收；不扩展 Gesture 范围。已停读工作树。
