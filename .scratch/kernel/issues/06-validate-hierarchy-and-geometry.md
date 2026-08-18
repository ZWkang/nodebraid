# 06 — 校验父子图与几何最终态

**What to build:** 让 Kernel 在保留 Node `parentId` 与可选 Size 的同时，对整个最终图一次性给出完整、确定排序的结构问题，使分组、容器和子流程不会产生悬空父节点、父子环或无效几何。

**Blocked by:** 05 — 连接 Node 并查询 Edge.

**Status:** resolved

- [x] Node 支持可选 parent ID 与可选 Size；Size 的宽高必须有限且非负，零尺寸有效。
- [x] Canvas Query 支持按 parent ID 获取规范排序的直接 child Node。
- [x] 最终 Draft 中 parent ID 必须引用存在的 Node，直接自环和多 Node 父子环都显式失败。
- [x] Transaction 中间态可以暂时缺少 parent、形成临时环或包含临时无效几何，只校验 callback 完成后的最终图。
- [x] 删除父 Node 时 Kernel 不隐式删除或重置 child；调用者必须在同一 Transaction 中显式处理。
- [x] `INVALID_GRAPH` 一次报告全部可检测的 missing endpoint、missing parent、parent cycle、invalid position 与 invalid size issue。
- [x] GraphIssue、issue details 与 issue 集合被冻结，并采用与写入顺序无关的确定 ordering。
- [x] 最终校验失败完整回滚，保持 revision 和当前 Canvas View 根引用。

## Answer

已保留并验证 `parentId` 与可选 Size，children Query 使用规范 ordering。最终图校验会聚合 missing endpoint、missing parent、去重父子环、invalid position 和 invalid size，并冻结和确定排序全部 GraphIssue；中间 Draft 仍允许暂时不完整。当前 20 个公开行为测试、93 个断言、包级 typecheck 与 build 通过。
