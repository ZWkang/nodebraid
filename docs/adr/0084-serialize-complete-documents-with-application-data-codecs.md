---
status: accepted
---

# 用应用 Data Codec 序列化完整 Document

`@nodebraid/document` 提供纯 `serializeCanvasDocument` 与 `deserializeCanvasDocument`，
以 `nodebraid/document`、`version: 1` 和应用 `dataFormat` 标识完整图文件。
格式保存 Node、Edge 的全部自有字段，保留 ID、parent 与 Port-qualified Endpoint，
允许空图；不保存本地 revision、Session、History 或派生 Port Snapshot。
它不是 Canvas Fragment 的另一个名称，既不携带 Selection，也不允许图外的 parent。

应用显式提供 `format`、`encode(data): string` 与 `decode(text): unknown`。
实体 data 在外层文件中是应用编码的字符串；框架不遍历 opaque data、不猜测通用 JSON
表示，也不把 Date、undefined 或其他合法业务值静默转换或丢弃。应用拥有业务格式版本，
框架在调用 decoder 前拒绝不匹配的版本与 dataFormat，外部 codec 异常保留原身份。

反序列化先验证文件结构，再通过独立 Kernel 的公开 Transaction 验证完整图不变量，
返回冻结的自有结构和原 codec 返回的业务 data 引用。图校验规则仍由 Kernel 维护，
文件层不复制 parent cycle 或引用闭合算法。文件读写属于应用；成功解码不修改活动画布。
恢复时应用在一次 History Baseline Transaction 内删除旧图并添加完整新图。

此决定保留 ADR-0012 的 opaque data 边界和 ADR-0078 的内存 Fragment 边界，
不增加存储 Provider、自动保存、迁移 Registry 或协作协议。
