---
status: accepted
---

# 由独立 Plugin 拥有完整 Duplicate Selection 行为

Duplicate Selection 作为公开且可独立安装的 NodeBraid Plugin 能力，以无输入 typed Command 的执行起点捕获当前 Selection 与 Canvas View，复制精确选中的 Node 与这些 Node 之间的全部 Edge，并在一个同步 Kernel Transaction 成功后由同一 Plugin 把原 Selection 成员映射到副本；自动携带但未显式选中的内部 Edge 不进入结果 Selection，edge-only Selection 为 no-op 且不调用 materializer、返回 `null`，完整成功返回对应 `CanvasCommit`。应用只通过一次同步 Duplicate ID Materializer 接收冻结且规范排序的源 Node/Edge ID，并返回每个源 ID 恰好一次的同类新 ID 映射；NodeBraid 复制冻结输出、忽略输出顺序并验证精确覆盖、同 namespace 唯一性、当前可用性与非 thenable，同一底层字符串可以分别作为 NodeId 与 EdgeId。NodeBraid 拥有复制范围与实体构造：Node 保留 type、size 与同一 opaque data 引用，绝对 top-left world position 统一增加一个有限 offset，默认 `{ x: 24, y: 24 }` 且允许显式零 offset；Edge 保留 type、opaque data 与 port-qualified Endpoint，self-loop 和每条 parallel Edge 分别重映射且不按 Endpoint 去重；被复制 Node 的 direct parent 在源集合内时重映射到副本，否则保留原 parentId，且不隐式复制 descendants。Transaction 前 Selection 已变化时以 Stale Duplicate 拒绝；Document Commit 后若较新的 Selection 已出现，则保留 Commit、拒绝 Command 且不覆盖该 Selection，也不会用第二个 Transaction 伪装回滚。
