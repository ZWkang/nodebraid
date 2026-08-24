---
status: accepted
---

# 在清理完成前保留 SVG Target Reservation

`@nodebraid/renderer-svg` 在 Factory 接受 Target 时同时建立进程内 Reservation 和稳定 DOM marker，任一存在都会拒绝第二份活跃或正在清理的实例。`dispose()` 调用后实例立即进入终态、停止输入并对全部调用复用同一幂等 Promise，但只在取消订阅与 Pointer Capture、断开 observer、移除投影子树并恢复 Provider-owned Target 属性全部成功后释放 Reservation。清理失败会聚合并显式拒绝 dispose Promise，同时保留 Reservation，防止残留 DOM 或监听器与新实例重叠。
