---
layout: home
titleTemplate: false

hero:
  name: CFlow
  text: 把流程画布拆成可组合能力
  tagline: 一份权威 Document，一组显式 Plugin。按需组合 Kernel、Session、Command、History、Layout 与 Renderer contract，而不是接手一个无法拆分的编辑器黑盒。
  actions:
    - theme: brand
      text: 运行 Quick Start
      link: /guide/quick-start
    - theme: alt
      text: 浏览能力地图
      link: /capabilities/

features:
  - title: 原子图内核
    details: 同步 Transaction、revision-bound Canvas View、Query 与可逆 Change Set，共同维护唯一权威 Document。
    link: /capabilities/graph-state
  - title: 显式能力组合
    details: Plugin 通过 Required Service 和 Activation 生命周期组合；没有隐藏 Service locator，也不会隐式安装默认能力。
    link: /capabilities/foundations
  - title: Renderer-agnostic
    details: Kernel、Session 与 Renderer protocol 保持分离。应用显式选择 Provider，核心不绑定 DOM、Canvas 或具体框架。
    link: /capabilities/rendering-contract
---

<FlowArchitecture />

<ProjectStats />
