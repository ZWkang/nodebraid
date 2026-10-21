What this change does: 将原 Basic SVG 手动 Dagre/full/LR 布局实现集成到当前 main，并修正 Layout 验证覆盖说明。

**Standards：passed。硬性规范违规 0 项；判断性 smell 0 项。**

已按当前 AGENTS、相关 ADR、工程原则、code-review、ponytail-review 和 Fowler baseline 复核完整 18 文件 patch，核对真实 Git 身份与提交父链。17 个文件的 blob 与此前审查的 `5de2df44b2aaa726307a419b8a9d61d78ceab366` 完全一致；README 的差异完整保留新 main 的流程与原则说明。

应用继续拥有 typed Layout Command，通过 sibling Dagre Layout Plugin 和现有 CommandService 执行，等待安装 active 后才发布 Runtime；符合 Provider 显式选择、单 Transaction、Session 分离及错误传播契约。浏览器断言继续使用真实控件、原生鼠标和公共 SVG DOM seam，覆盖位置变化、Selection/Viewport 保持、原 Port 连接、无净变化、单步 Undo/Redo 及移动后新连线。按单用户开发者参考应用的负载审查，未发现需要新增抽象或协调机制的问题。

独立核对了 #60 的全部 19 个流程文件：18 个与 main 完全一致，README 仅增加 Layout 功能说明，恢复、retarget 复验和实际 main 交付规则均保留。五处覆盖说明准确区分 Basic SVG suite 与四个通用 preview 场景；文档截图仍明确说明额外 Fit View，未冒充当前发布 head 的运行证据。

固定身份：

- Base：`68497fbc782be1a56dfe20f7544dead964dffdaa`
- Head：`9423ff943739b6d2cf32e4a5a655ae1082ea75f1`
- Tree：`a587fbb02dcb10dba49c093f72c7f3b78a90258c`
- Binary patch SHA-256：`841b1ac37288a169b5d4fe628dfe963ac69f45ff01734238bd94921d1b028e2b`
- Parents：当前 main `68497fbc782be1a56dfe20f7544dead964dffdaa`、原实现 `361a9358454f851f4f603f020822e79633c328e9`。

Verdict: Ship（代码审查通过）。
Not checked: 本次未执行测试、全量检查或发布操作；仅复核已有定向日志。此前 Example/docs 结果保留原身份，当前交付仍需全量验证及实际发布 head 的 Layout 交互证据。
