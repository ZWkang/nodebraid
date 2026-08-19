---
status: accepted
---

# 发布稳定的 SVG DOM 与层级 seam

`@cflow/renderer-svg` 以稳定 class 和 `data-*` attributes 暴露样式 seam，只写入必要的 SVG Geometry attributes，不提供 theme registry、任意 Node render callback 或内联产品主题。单一投影根内的 Edge layer 先于 Node layer，同层按 Kernel Snapshot 的规范 ID 顺序排列；Selection 只改变 class 或 attribute，不重排实体也不创建第二个 SVG root。`reset` 可重建全部实体元素，连续 `commit` 则对已有 keyed Node 与 Edge 原位更新 attributes 并保持 DOM element identity，只对增删实体调整节点与规范顺序；派生 Edge Geometry 和 Session 更新也不替换已有实体元素。这使 CSS 可定制外观，同时使投影顺序、命中优先级、增量 identity 与测试选择器保持确定。
