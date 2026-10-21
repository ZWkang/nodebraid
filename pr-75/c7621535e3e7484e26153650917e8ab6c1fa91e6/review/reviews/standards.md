# Standards + ponytail-review — Issue #74

Verdict: passed

- Base: `99ed305515afaec32ef49494b509446ad9ba998c`
- Head: `d03be1d5138bf2937bf49c9b69f21c7c3bb361f4`
- Tree: `a662eb153bdecc5ec4385187135bb3e8fc6788a9`
- Binary patch SHA-256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`

完整两文件及新增公共测试已审查。变更让 Duplicate 自己遍历并翻译实际映射元素，捕获集合后继续使用原 Fragment 验证器。

## 硬规范

未发现违反。已追踪 Example → Duplicate factory/Command → Fragment materialization → Kernel Transaction/Session Selection，以及 Clipboard 共享消费者。

`packages/plugin-duplicate-selection/src/duplicate-selection-command.ts` 中 Node/Edge 集合各读取一次；无效 Node 集合仍先于 Edge 字段读取失败。Array.from 使用自有 array-like 描述，不执行输入 map、iterator、constructor 或 species。精确覆盖、ID 类型/namespace/唯一性仍由 Fragment 边界验证，实体写入和 Selection 更新顺序保持，符合 ADR0073/0076/0078 及 Boundary Discipline。

外部 materializer、集合/元素读取失败没有被统一捕获改写，原 INVALID_MATERIALIZATION 路径保留，符合 ADR0077。新增测试通过真实 Host、Kernel、Command、Session 检查拒绝、未提交状态、集合捕获及有效 hooked arrays，符合 Test Behavior, Not Implementation。

已读取保存的行为 red：非法映射错误地 resolve，以及重复读取集合导致有效输入 reject。依赖未构建的导入失败未计作行为 red。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。修复集中在应用映射到 Fragment 的负责边界，复用既有共享验证；按单 Canvas Host 的选中子图负载，新增索引遍历为线性，未增加抽象、依赖、cap 或 fallback，符合 Fix Root Causes 和 Laziness Protocol。

## 实际检查及限制

本轮 `bun test packages/plugin-duplicate-selection/tests`：34 pass、117 assertions（Bun 1.4.2）。完整范围 `git diff --check` 通过，工作树干净。

未执行构建、full check、浏览器、远端发布或 CI；不将其他执行记录当成本轮运行结果。
