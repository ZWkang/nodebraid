## Spec 审查

依据 [#159 范围与验收条件](https://github.com/ZWkang/nodebraid/issues/159#issuecomment-7187149173)，核对 e56e833 至 35596ff 的六个变更文件。Basic SVG 在节点原位提供标题输入，默认标题与空数据节点的 SVG 显示一致，已有显式空标题保留。确认使用打开时捕获的节点对象执行既有 Node Editing Command。Escape 取消、Delete 在输入框内编辑、提交后一步撤销、其他编辑已替换节点时保护新值，均有 Chromium 回归断言。未发现剩余规格缺口。

修复提交在媒体场景双击前将画布滚入视口。已核对当前 head 的 preview.json、node-authoring/actions.log 及该场景声明的各产物摘要。记录显示滚动画布后双击目标节点，输入并确认后读到 Inline card，执行一次 Undo 后读到 Custom card。六个媒体场景均通过。本轴复核了已有浏览器执行记录，未单独重跑浏览器或全量工程检查。