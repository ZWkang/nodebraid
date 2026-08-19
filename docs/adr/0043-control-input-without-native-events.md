---
status: accepted
---

# 不通过原生事件控制 Pointer 与 Focus

CanvasRenderer 以 CFlow-owned `capturePointer(pointerId)`、`releasePointer(pointerId)` 与 `focus()` 控制输入生命周期，不向 Interaction 传递 native Event、DOM Target 或后端 capture handle。Capture 只接受仍活跃的 Pointer，同一活跃 Pointer 的重复 capture 与 release 幂等，up、cancel 和 Renderer dispose 自动释放，未知或已结束 ID 显式失败；只有拥有 Renderer Focus 时才发布 Keyboard Input，Headless Provider 也维护同一逻辑状态。首版不暴露逐事件 `preventDefault`，浏览器滚轮、触摸、上下文菜单等默认行为由具体 Provider 的显式 config 与 Target 集成策略决定，listener 返回值不能暗中改变后端行为。
