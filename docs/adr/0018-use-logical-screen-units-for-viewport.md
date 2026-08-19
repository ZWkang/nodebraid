---
status: accepted
---

# Viewport 使用逻辑屏幕单位

Viewport 使用 `screen = world × zoom + offset` 将世界坐标映射到逻辑屏幕坐标，其中浏览器环境的逻辑屏幕单位对应 CSS pixel；`devicePixelRatio` 与物理像素缩放只属于 Renderer backing store。Viewport 只接受有限数值与大于零的 zoom，不设置或静默应用产品级缩放上下限。这个边界让同一 Viewport 在不同 Renderer 与设备像素比下表达相同视图，并阻止渲染设备细节进入 Session。
