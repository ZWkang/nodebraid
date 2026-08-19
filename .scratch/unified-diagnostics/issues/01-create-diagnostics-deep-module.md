# 01 — 建立 Diagnostics deep module

**What to build:** 新增零依赖 `@cflow/diagnostics`，提供 CFlowError、DiagnosticValue normalization、Diagnostic Event/Fault 类型和确定性 `describeError()`，让其公开 Interface 足以承载后续 Runtime 集成。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 建立 package、构建、类型、测试、声明检查和 package-name import 基线。
- [x] 实现 CFlowError 的 domain、code、规范化 details 和可选 cause。
- [x] 校验并递归冻结 DiagnosticValue，非法值带精确路径显式失败。
- [x] 实现 CFlow、Aggregate、native、unknown 与 circular error description。
- [x] 保持 package 零运行时依赖且不引用任何上层 CFlow 包。
- [x] 通过公开 Interface 完成 red → green 测试。

## Answer

`@cflow/diagnostics` 已建立为零依赖 deep module。公开 seam 覆盖 CFlowError、不可变 DiagnosticValue、Error/Aggregate/cause/circular 描述、Diagnostic Event 描述以及 Sink/Fault 类型；12 个 package 测试、typecheck、build、声明隔离和 package-name import 全部通过。
