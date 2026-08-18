# 05 — 连接 Node 并查询 Edge

**What to build:** 让调用者可以在 Transaction 中用 Edge Endpoint 连接 Node，通过严格 Edge writer 编辑连接，并从 committed View 或 Draft Query 按方向读取稳定、确定排序的图关系。

**Blocked by:** 03 — 封闭 Transaction 生命周期与失败原子性; 04 — 严格编辑 Node 并折叠净零变化.

**Status:** resolved

- [x] Edge 支持 source、target Endpoint 与可选 Port ID；Kernel 不校验业务 Port 是否存在。
- [x] Edge writer 提供与 Node 相同的严格 add/replace/remove、ID mismatch、coalescing 和净零语义。
- [x] 最终 Draft 中 Edge Endpoint 必须引用存在的 Node；同一 Transaction 的中间态可以暂时悬空。
- [x] Kernel 允许自环，不判断业务连接规则或实体数量限制。
- [x] Canvas Query 支持 direct Edge、incoming、outgoing 与 incident 查询，并使用规范 Edge ID ordering。
- [x] incident 查询中的自环只返回一次。
- [x] 对不存在 Node 的关系查询显式返回 entity-not-found 错误，不静默返回空集合。
- [x] 删除仍被 Edge 引用的 Node 不会隐式级联，而是在最终校验时失败；显式先后操作顺序不影响最终有效 Transaction。
- [x] Node 与 Edge 可以使用相同底层 ID 字符串而不发生 namespace 冲突。

## Answer

已实现完整 Edge writer、Endpoint 防御性复制、direct/incoming/outgoing/incident Query、规范 ordering、自环去重以及最终 Endpoint 引用校验。Edge 严格编辑、coalescing、净零语义和 Transaction closed guard 与 Node 保持一致。当前 17 个公开行为测试、85 个断言、包级 typecheck 与 build 通过。
