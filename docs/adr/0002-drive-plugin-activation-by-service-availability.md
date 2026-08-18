---
status: accepted
---

# 由 Runtime Service 可用性驱动 Plugin 激活

同一个 Plugin 可以在一个 Plugin Host 中形成多次独立 Plugin Installation，Runtime Service 通过 CFlow 强类型 Service Token 标识。缺少 Required Service 的 Installation 保持 pending；依赖出现时激活、消失时停用、再次出现时重新激活。单次激活失败只回滚该次激活已经注册的资源，并显式暴露失败，不破坏 Host 与其他 Installation。这个模型保留了时序组合能力，同时避免字符串服务键、`undefined` 依赖和局部初始化泄漏。
