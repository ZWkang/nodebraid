---
status: accepted
---

# 用精确源 Node 保护 data 编辑

独立 Node Editing Feature Plugin 注册 Create Node 与 Update Node Data Command，
只依赖 Kernel、Command 与 Plugin Host。Create 接收应用提供的完整 Node；Update
接收编辑开始时的精确 Node 引用和新的 opaque data。在一个同步 Transaction 中检查
目标仍是同一源值，再只替换 data，保留全部其它字段。无净变化不新增 revision 或历史，
实际变化自然进入既有 History，纯命令不改 Selection。

源值身份沿用 ADR-0072，不依赖全图 revision、不深合并 data，也不增设生命周期 token。
任何对目标 Node 的实际替换，包括移动、Undo/Redo 和跨提交同 ID 重建，都会使旧草稿
过期；无关 Node 的变化不影响提交。这个有意选择的严格规则避免把旧编辑应用到另一份
Node，也明确承认边拖动同一节点边编辑的草稿需要重新载入。Kernel 原有净零语义保持。

应用拥有草稿、字段校验和表单。Apply 一次提交，Cancel 不改图；切换编辑对象前明确
应用或放弃。冲突保留草稿并显式重新载入，不覆盖、不隐式重试。框架不规定名称、标签
或业务 schema，继续遵守 ADR-0012 的不透明不可变 data 契约。
