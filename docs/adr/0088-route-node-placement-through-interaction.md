---
status: accepted
---

# 在 Interaction 中统一路由单次节点放置

Node Placement 是专用的一次放置请求，提供开始、取消和最终创建/取消/失败结果。
Interaction 统一决定 primary Pointer 输入属于放置还是既有选择、拖动和连接；
不通过第二个广播 listener 抢事件，也不为这一项能力引入通用 Tool Registry。

应用的同步 materializer 接收落点世界坐标并返回完整 Node，随后通过 Create Node
Command 原子提交。示例把落点作为左上角，以提示和光标表达待放置状态；不增加完整
跟随预览。空白处完成未超过既有阈值的 primary down/up 才放置一次并选中新 Node，
然后返回普通编辑。点击实体或拖动不误创建；待放置时仍允许平移、缩放，候选点击
遇到 Viewport 改变不得按旧坐标基线提交。

Esc、显式取消、请求替换和 Activation 释放按请求 identity 结束相应操作，旧 handle
不能结束新请求。提交前失败保持图与 Selection，不自动重试；提交后的渲染或 Selection
失败不能伪装为原子回滚。所有失败、取消和资源清理保留既有显式错误语义。
