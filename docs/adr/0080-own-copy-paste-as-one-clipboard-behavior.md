---
status: accepted
---

# 由一个 Clipboard Plugin 拥有 Copy 与 Paste 生命周期

`@nodebraid/plugin-clipboard` 注册无输入 Copy/Paste Commands，并由 sibling Shortcut Plugin 通过唯一 `interactionPlugin` authority 贡献 focused Mod+C / Mod+V。Copy 在命令开始时捕获一份 committed Canvas Fragment 后异步写入，Paste 异步读取和解码后在 Transaction 内重验 fresh ID、外部 parent 与当前 Selection，再提交一次 Document Commit 并更新 Selection；并发调用不排队，较新的 Selection 获胜，已提交变化不会以补偿 Transaction 回滚。
