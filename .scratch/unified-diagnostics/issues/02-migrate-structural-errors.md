# 02 — 迁移结构性错误与因果树

**What to build:** 让现有七个领域 Error 继承 CFlowError，使用固定 domain 与 JSON-safe details，并统一 cause 和 cleanup AggregateError tree，同时保留外部失败身份。

**Blocked by:** 01 — 建立 Diagnostics deep module

**Status:** resolved

- [x] 迁移 Kernel、Layout、Plugin Host、Kernel Plugin、Command、Session 与 History Error。
- [x] 保留公开类、code 和前三个构造参数，增加可选 cause。
- [x] 把 raw invalid value、Service Token 等 details 转成安全分类字段。
- [x] 删除递归拍平 cleanup AggregateError 的行为，保留阶段 message。
- [x] 锁定所有 domain/code 组合唯一且可精确搜索。
- [x] 证明 Callback、Setup、Handler、Provider 与 Abort reason 仍是原对象。

## Answer

七个领域 Error 已统一继承 CFlowError，并使用固定 domain 与 JSON-safe details；Kernel geometry、Change Set conflict、Plugin Host Token、Layout Proposal、Session Viewport/Selection/subscriber 都迁移为稳定机器字段。Callback、Setup、Handler、Provider 与 Abort reason 的既有 identity 测试继续通过；Runtime cleanup 现在保留 Host、Installation 与 Activation AggregateError 阶段，同时保持每个 leaf 只出现一次。
