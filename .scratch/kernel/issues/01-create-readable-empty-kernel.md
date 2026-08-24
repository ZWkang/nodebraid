# 01 — 创建可读取的空 Kernel

**What to build:** 让 NodeBraid 调用者可以从独立的 Kernel package 创建一个拥有空 revision-zero Document 的 Kernel，并通过稳定、不可变且 revision-bound 的 Canvas View 读取空 Node 与 Edge 集合，不接触任何内部 Store、Map 或 Runtime 生命周期。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 新增可独立发布、构建、类型检查和测试的 `@nodebraid/kernel` package，且没有 Runtime、Cordis、RxJS、Renderer、框架或 core 反向依赖。
- [x] 公开 Node ID 与 Edge ID 的独立品牌类型和构造函数；空字符串显式失败，两个实体 namespace 允许相同底层字符串。
- [x] 公开首版 Node、Edge、Endpoint、Point、Size、Canvas Snapshot、Canvas Query、Canvas View 和 CanvasKernel 读取契约。
- [x] `createCanvasKernel()` 创建空 revision-zero Document，Snapshot 中的 Node 与 Edge 集合为空。
- [x] 同一 revision 的 `read()` 返回同一个 Canvas View、Snapshot 与 Query 根引用。
- [x] 空 Canvas Query 的直接实体查询返回 `undefined`，对不存在 Node 的关系查询显式失败。
- [x] 公开返回的 NodeBraid-owned 结构和集合被冻结，不暴露内部 Map 或可写状态。
- [x] 行为仅通过公开 Kernel seam 测试，不测试内部 representation。

## Answer

已建立独立的 `@nodebraid/kernel` package 与公开读取 seam。空 Kernel 从 revision 0 开始，同一 revision 保持 Canvas View、Snapshot 与 Query 引用稳定；品牌 ID、空 ID 错误、空查询和关系查询错误均通过 3 个公开行为测试、17 个断言、包级 typecheck 与 build 验证。
