# 01 — 建立首个 Basic Canvas Composition 闭环

**What to build:** 让应用通过一个显式 Renderer Factory 创建普通 Basic Canvas Composition Plugin，在自己拥有的 Plugin Host 中安装后获得 Kernel、Command、Session、Renderer、Interaction 与 History 的完整基础 Canvas Runtime。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 发布后端无关的 `@nodebraid/preset-basic` workspace package 与具名创建入口。
- [x] Renderer Factory config 保持精确类型推导，并原样进入现有 Renderer Runtime Plugin seam。
- [x] Composition 使用 Child Installation 固定组合六个真实 Feature Plugins，并在全部 active 后才进入 active。
- [x] sibling Consumer 通过静态 Required Service Binding 获取基础能力，不新增聚合 Service 或动态 lookup。
- [x] 公共 seam 验证 Move Nodes Command、History Undo 与真实基础 Plugin 生命周期。

## Answer

`@nodebraid/preset-basic` 现已通过具名 `createBasicCanvasPlugin` 接受显式 Renderer Factory，并返回要求同一 Provider config 的普通 Plugin。它依次拥有 Kernel、Command、Session、Renderer、Interaction 与 History Child Installation，等待全部 active 后才完成父 Activation。真实 Plugin Host Consumer 已通过静态 Service Binding 执行 Move Nodes Command 与 History Undo；package-name import、package tests 和独立 typecheck 均已通过。
