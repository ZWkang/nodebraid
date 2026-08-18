# 02 — 通过强类型 Runtime Service 连接 Provider 与 Consumer

**What to build:** 让 Plugin 使用强类型 Service Token 和静态 Service Binding 表达 Runtime Service 关系。Consumer 可以先安装并保持 Pending Installation；Provider 成功激活后，Consumer 只能通过自己声明的局部 binding 获得完整、类型安全且原子发布的 Service。

**Blocked by:** 01 — 运行并释放第一个 Cordis-backed Plugin.

**Status:** resolved

- [x] `defineService()` 创建运行时身份唯一、携带 TypeScript Service 类型并具有诊断名称的 Service Token；相同诊断名称不会形成相同身份。
- [x] Plugin 通过静态 readonly `requires` 与 `provides` binding 声明 Required Service 和 Provided Service，定义后不能动态改变依赖图。
- [x] Plugin Context 只通过 `services.<binding>` 暴露已声明 Required Service，不提供动态 `get()` 或 Host Service lookup。
- [x] 缺少 Required Service 的 Consumer 保持 pending，Snapshot 准确列出缺失 Token，且 setup 不会提前执行。
- [x] Plugin setup 通过返回值一次性提交全部声明的 Provided Service；所有值验证成功后才原子公开。
- [x] 缺少、多出、重复、未声明、null 或 undefined 的 Provided Service 结果使 Activation failed，且不会泄漏部分 Service。
- [x] Provided Service Token 从 Provider Installation 创建时保留到 dispose；pending、active 或 failed Provider 都阻止第二个 Provider 使用同一 Token。
- [x] Provider conflict 在创建 Installation 前同步抛出结构化 `PluginHostError`，并且不留下半个 Installation 或 Token reservation。
- [x] 引入 Required Service 环路的安装同步失败，错误包含完整 Plugin 与 Service Token 路径，原有 Installation 保持不变。
- [x] 类型检查覆盖配置参数、Service Binding 推导、setup 返回值以及未声明 Service 访问；运行时测试覆盖 Consumer-first 和 Provider-first 两种安装顺序。

## Answer

已实现强类型 Service Token、静态 Service Binding、Cordis-backed Provider/Consumer 激活、原子 Provided Service publication、Provider reservation、contract validation 与结构化依赖环诊断。公开 seam 的 26 个测试、83 个断言、类型检查、构建、格式、lint 与声明泄漏检查均通过，未实现 Ticket 03 的重激活语义。
