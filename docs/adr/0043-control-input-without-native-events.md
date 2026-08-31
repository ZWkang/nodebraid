---
status: accepted
---

# 不通过原生事件控制 Pointer 与 Focus

CanvasRenderer 以 NodeBraid-owned `capturePointer(pointerId)`、`releasePointer(pointerId)` 与 `focus()` 控制输入生命周期，不向 Interaction 传递 native Event、DOM Target 或后端 capture handle。Capture 只接受仍活跃的 Pointer，同一活跃 Pointer 的重复 capture 与 release 幂等，up、cancel 和 Renderer dispose 自动释放，未知或已结束 ID 显式失败；只有拥有 Renderer Focus 时才发布 Keyboard Input，Headless Provider 也维护同一逻辑状态。Renderer Input Subscription 可以登记独立的同步 Disposition listener，只表达 backend default action，使 live Interaction Shortcut Binding 在行为入队前精确控制当前输入而不暴露原生 `preventDefault()`；滚轮、触摸、上下文菜单等 Provider 集成策略仍可由具体 Factory config 明确配置。
