---
status: accepted
---

# 将 Duplicate Selection 发布为专用 Plugin package

NodeBraid 使用独立的 `@nodebraid/plugin-duplicate-selection` 公开 Duplicate Selection Command、`createDuplicateSelectionPlugin()`、Duplicate ID Materializer 配置与 `createDuplicateSelectionShortcutPlugin()`；两个 factory 都在创建时复制冻结已知配置 shell，并让每次 fresh Activation 从同一稳定配置建立新的 Command 或 Shortcut Registration。Shortcut Binding 的注册 authority 留在拥有 Renderer Input 与 Active Gesture 的 `@nodebraid/plugin-interaction`；`@nodebraid/preset-basic` 不隐式或可选安装 Duplicate，应用与 Examples 将 Behavior 和 Shortcut 作为 sibling Plugin 显式组合。这个单向依赖让 Duplicate 行为可以脱离快捷键独立调用和生命周期组合，同时不把 Clipboard/Serialization、通用 Canvas Fragment、独立 Shortcut Runtime 或第二套 Interaction 状态机带入首版。
