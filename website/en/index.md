---
layout: home
titleTemplate: false

hero:
  name: NodeBraid
  text: Compose a flow canvas from explicit capabilities
  tagline: One authoritative Document, one explicit Plugin graph. Compose Kernel, Session, Command, History, Layout, and Renderer contracts without inheriting an indivisible editor black box.
  actions:
    - theme: brand
      text: Run the Quick Start
      link: /en/guide/quick-start
    - theme: alt
      text: Explore capabilities
      link: /en/capabilities/

features:
  - title: Atomic graph kernel
    details: Synchronous Transactions, revision-bound Canvas Views, Queries, and reversible Change Sets maintain one authoritative Document.
    link: /en/capabilities/graph-state
  - title: Explicit composition
    details: Plugins compose through Required Services and Activation lifecycles—without a hidden Service locator or implicit defaults.
    link: /en/capabilities/foundations
  - title: Renderer-agnostic
    details: Kernel, Session, and Renderer contracts stay separate. Applications choose Providers without binding the core to DOM, Canvas, or a framework.
    link: /en/capabilities/rendering-contract
---

<FlowArchitecture />

<ProjectStats />
