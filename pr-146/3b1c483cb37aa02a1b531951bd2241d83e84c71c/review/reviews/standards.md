本次变更：将私有 Examples Application 的草稿决策、Apply 用例和视口计算移出 React，统一应用缩放范围。

Standards + ponytail-review：passed，0 项发现。已检查完整 8 文件 diff、调用方、Command/Session 实现、相关 ADR、单元测试与现有浏览器断言。node-draft.ts:28/55/85 分别拥有投影、草稿协调与提交后读取；React 保留 Hooks、局部状态、Effect 和错误展示。Apply 捕获既定目标并保留原始失败，源 Node 身份检查仍由 Transaction 内的既有 Command 负责，符合 ADR-0087、Boundary Discipline。viewport.ts:3/5/13 集中缩放范围与纯计算；DOM 测量和 Session 写入保留在 basic-svg.tsx:362/368，符合 ADR-0018。未新增 controller/store、生命周期管理或无当前用途的抽象，未发现可复现的错误或需修复的 smell。

按单浏览器 Canvas 的现有应用负载评估。已读取 application-tests.log：25 pass、0 fail；affected-check.log：格式、lint、构建、类型与四个 Example browser suite 完成。新增测试通过真实 Host/Kernel/Command/History 验证提交、冲突、净零、Undo/Redo，以固定行为结果验证视口。未重复执行测试；正式全量 check、报告发布与回读尚待协调者完成，本结论不代表交付 ready。