# 05 — 从 core facade 发布稳定 Plugin Host seam

**What to build:** 让普通 NodeBraid 消费者从 `@nodebraid/core` 使用已经验证的 Plugin Host interface，同时保留 `@nodebraid/runtime-cordis` 的窄包入口。发布产物必须保持 NodeBraid-owned seam，并证明 Cordis implementation 没有泄漏到公共声明或依赖方向中。

**Blocked by:** 04 — 通过 Child Installation 组合并清理 Plugin Tree.

**Status:** resolved

- [x] `@nodebraid/core` 重新导出 Plugin Host 的公开函数、类型和结构性错误，且不复制另一份实现。
- [x] `@nodebraid/runtime-cordis` 可以被高级消费者独立导入；内部包不反向依赖 `@nodebraid/core`。
- [x] 生成的 TypeScript declarations 和 package exports 不包含 Cordis Context、Fiber、Service、effect 或其他 Cordis 类型。
- [x] core facade 的运行时 smoke test 可以创建 Host、安装最小 Plugin、等待 active 并完成 dispose。
- [x] core facade 的类型检查验证 Service Token、配置、Required Service binding 与 Provided Service 返回值仍能正确推导。
- [x] package 元数据准确表达发布文件、依赖关系、构建、类型检查与测试入口，并保持 Cordis 只属于 runtime implementation。
- [x] 项目文档准确说明 `@nodebraid/core` 是公共收口、`@nodebraid/runtime-cordis` 是 implementation package，以及 Everything is Plugin 的首版范围。
- [x] 运行格式检查、lint、类型检查、全部测试和构建；任何失败直接暴露并修复，不增加静默 fallback。

## Answer

`@nodebraid/core` 已作为单一 facade 重导出 `@nodebraid/runtime-cordis`，两个 package-name 入口均通过真实生命周期探针和类型推导验证。Clean standalone core build、root delegated build、自动 declaration artifact 检查和两个 package pack dry-run 均通过；Cordis 类型未越过 NodeBraid seam。最终 review 进一步修复了订阅错误隔离、Node 22 error reporting、多 Service 严格逆序 withdrawal、结构性错误统一和通用 workspace 构建。全仓 51 个测试、183 个断言、lint、typecheck、build 与 feature-owned format 全绿；全仓 format:check 仅被既有 `.agents/skills/*` 非 feature 文件阻断。
