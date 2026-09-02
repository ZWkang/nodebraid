---
status: accepted
---

# 通过专用 Capability 解析 Port

Port 不成为 Node、Edge 之外的 Document Entity，Document 仍只在 Edge Endpoint 上保存可选 `portId`。Node 类型或领域 Plugin 在 Activation 生命周期内向专用 Port Capability 注册具名贡献，Capability 针对已提交 Node 值产生不可变、规范排序且与 Document revision 对齐的 Port Snapshot；贡献释放会立即移除定义。这个 seam 允许多个真实领域贡献者共享同一语义，同时不建立 Port 独立持久化、从不透明 data 猜测定义、通用 Registry 或 Tool 系统。
