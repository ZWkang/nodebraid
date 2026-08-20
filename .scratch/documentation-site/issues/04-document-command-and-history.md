# 04 — 介绍 Command 与 History

**What to build:** 让采用者理解强类型异步行为入口如何与 Document History 组合，并能正确安装、执行、取消和释放 Command 与 Undo/Redo 能力。

**Blocked by:** 01 — 交付中文文档站与可运行 Quick Start.

**Status:** completed

- [x] Execution and History 总览解释异步准备、同步 Transaction 提交以及 History replay 的关系。
- [x] Command Plugin 页面说明强类型 token、注册、执行、协作取消、in-flight cleanup 和错误身份。
- [x] History Plugin 页面说明 Baseline、Recordable Commit、Undo/Redo Command、Snapshot、single-flight replay 与 Activation 生命周期。
- [x] 示例等待 Required Services 激活并正确释放 Host，不复制现有 README 中不完整的生命周期代码。
- [x] 页面明确 History 不拥有第二份 Document，也不把内部 Entry 或 imperative undo/redo 方法暴露在 Service 上。
- [x] 所有新增页面通过文档检查并可由 Execution and History 导航到达。
