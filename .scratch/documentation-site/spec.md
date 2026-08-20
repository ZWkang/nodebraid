# CFlow Documentation Site

**Status:** ready-for-agent

## Problem Statement

CFlow 已经交付 15 个相互组合的 package，但外部 TypeScript 开发者目前只能从根 README、各 package README、目标架构、阶段性基线、领域术语和 ADR 中自行拼接产品全貌。这些材料面向不同读者，内容深度不一致，还混合了当前实现、目标设计和暂未交付能力。结果是开发者难以快速判断 CFlow 当前能解决什么问题、应从哪里开始、哪些 package 需要一起使用，以及哪些能力仍不可用。

现有 package README 也存在明确漂移：部分页面仍把已经交付的 Runtime Plugin 写成未来能力，部分示例没有等待 Activation 或释放 Plugin Host。仓库没有公开文档站、统一能力导航、全文搜索、经过执行验证的 Quick Start 或持续构建门禁。

此外，公开 npm registry 中的 `@cflow/core` 属于另一个项目。本仓库暂时没有可安全复制的 npm 安装命令。若文档直接宣传 `bun add @cflow/core`，访问者会安装错误的软件。

## Solution

建设一个中文优先的 CFlow Documentation Site，首要服务正在评估或采用 CFlow 的外部 TypeScript 开发者。站点将 CFlow 准确定位为可组合、Renderer-agnostic 的 headless flow canvas engine，介绍当前已经交付的 Plugin、Runtime Service、Provider 与 package 组合关系，不把目标架构或并行设计包装成可用功能。

站点采用 VitePress 生成静态页面，使用定制产品首页承载价值主张，使用默认文档主题承载导航、代码阅读、全文搜索和移动端布局。内容按五个能力族组织，并为全部 15 个 package 提供独立详情页。每个页面统一说明问题、适用场景、提供的能力、运行时依赖、组合方式、限制、非目标和验证依据。

首页的主要转化动作是运行一个真实 Quick Start。首发 Quick Start 只提供源码 checkout 流程，通过 `@cflow/core` 公共 facade 创建 Plugin Host、安装 Kernel Plugin、提交一个 Node，并正确等待 Activation 与释放 Host。所有安装区域必须明确 package 尚未以本项目身份发布，禁止展示会安装到无关项目的 npm 命令。

站点通过一个顶层 `docs:check` seam 完成 Quick Start 执行和生产构建，并由仓库总检查复用。完整内容通过 GitHub Pages 发布，首发使用仓库子路径，未来可迁移 npm scope、英文内容和自定义域名。

## User Stories

1. As an external TypeScript developer, I want to understand CFlow's current product position from the homepage, so that I can decide whether it fits my canvas-engine needs.
2. As an external TypeScript developer, I want CFlow described as a headless canvas engine, so that I do not mistake it for a finished visual editor.
3. As an evaluator, I want current capabilities separated from roadmap capabilities, so that planned work is never presented as available software.
4. As an evaluator, I want a concise explanation of why CFlow is plugin-based and renderer-agnostic, so that I can understand its differentiating architecture without reading internal ADRs.
5. As an evaluator, I want the homepage to lead to a working Quick Start, so that I can validate the project through behavior rather than marketing claims.
6. As an evaluator, I want the Quick Start to use the public core facade, so that the first experience matches the intended consumer entry point.
7. As an evaluator, I want the Quick Start to produce an observable committed revision and Node count, so that successful execution is unambiguous.
8. As an evaluator, I want the Quick Start to wait for Plugin Activation and dispose the Plugin Host, so that the example demonstrates the real lifecycle contract.
9. As an evaluator, I want source checkout instructions while packages are unpublished, so that I can run the correct project without installing an unrelated npm package.
10. As an evaluator, I want an explicit unpublished-package warning, so that I do not copy an unsafe installation command.
11. As a Chinese-speaking developer, I want the initial site and navigation in Simplified Chinese, so that I can evaluate the system efficiently.
12. As a documentation reader, I want code identifiers and package names preserved in English, so that examples stay aligned with TypeScript source.
13. As a documentation reader, I want local full-text search, so that I can find a Service, Plugin, Provider, error contract or package quickly.
14. As a mobile reader, I want navigation and content to remain usable on a narrow screen, so that the site is not desktop-only.
15. As a reader, I want dark and light presentation supported by the documentation theme, so that the site respects my viewing preference.
16. As a reader, I want a five-family capability overview, so that I can navigate by problem before learning package boundaries.
17. As a reader, I want a complete 15-package index, so that no currently delivered package is hidden.
18. As a reader, I want Foundations to explain core, Plugin Host and Diagnostics together, so that infrastructure packages are not sold as unrelated features.
19. As a reader, I want Graph State to explain Kernel and Kernel Plugin together, so that pure graph semantics remain distinct from Runtime integration.
20. As a reader, I want Session values and Session Runtime behavior explained together, so that Selection and Viewport are not confused with Document state.
21. As a reader, I want Command and History explained as cooperating Runtime capabilities, so that typed execution and Undo/Redo composition are clear.
22. As a reader, I want Layout contracts, Runtime integration and concrete Providers presented as one capability family, so that I can select the required package set.
23. As a reader, I want Dagre and ELK differences stated without declaring a default Provider, so that provider choice remains explicit.
24. As a reader, I want Renderer API and Renderer Plugin boundaries explained together, so that backend-neutral contracts are distinct from a concrete renderer.
25. As a reader, I want the Renderer pages to state that no committed concrete Renderer Provider exists, so that I do not expect visible rendering from the current package set.
26. As an adopter, I want every module page to state when to use the package, so that I can distinguish public entry points from narrow advanced imports.
27. As an adopter, I want every module page to state what the package provides, so that package descriptions translate into concrete behavior.
28. As an adopter, I want every Runtime Plugin page to state its Required Services and provided Service, so that composition requirements are explicit.
29. As an adopter, I want every module page to state what it deliberately does not provide, so that architectural boundaries are actionable.
30. As an adopter, I want examples grounded in current public exports, so that copied code does not depend on private files.
31. As an adopter, I want lifecycle-sensitive examples to demonstrate cleanup, so that documentation does not normalize resource leaks.
32. As an adopter, I want package relationships cross-linked, so that I can move from a capability to its contracts, Runtime adapter and Provider.
33. As an advanced consumer, I want the core facade distinguished from narrow package imports, so that I can choose an entry point intentionally.
34. As a contributor, I want public documentation to use the domain glossary vocabulary, so that site language does not diverge from code and ADRs.
35. As a contributor, I want target architecture treated as context rather than implementation proof, so that future modules are not accidentally published as current.
36. As a maintainer, I want current capability claims grounded in source, public exports and tests, so that README wording alone cannot establish availability.
37. As a maintainer, I want module pages to use a repeatable content structure, so that future package documentation remains comparable.
38. As a maintainer, I want public site content separated from internal ADR and architecture material, so that audience boundaries remain clear.
39. As a maintainer, I want package README files to remain concise and link to the public site, so that npm and GitHub entry points do not duplicate the entire site.
40. As a maintainer, I want package naming displayed from centralized metadata where practical, so that a future npm scope migration has a controlled blast radius.
41. As a maintainer, I want the documentation build to fail on invalid site content or dead internal links, so that broken navigation cannot be published silently.
42. As a maintainer, I want the documented Quick Start executed during checks, so that the primary example cannot drift from public APIs.
43. As a maintainer, I want one top-level documentation check, so that local development and CI use the same completion gate.
44. As a maintainer, I want the repository-wide check to include documentation verification, so that product documentation is part of normal quality control.
45. As a maintainer, I want real-browser visual inspection of the homepage and documentation layout, so that a successful static build is not mistaken for usable presentation.
46. As a maintainer, I want GitHub Pages built from the main branch using the same production command, so that deployment cannot bypass local validation.
47. As a maintainer, I want the GitHub Pages base path configured for the repository subpath, so that assets and navigation work outside a root domain.
48. As a future release maintainer, I want unpublished warnings localized to one controlled presentation seam, so that they can be removed safely after package migration.
49. As a future release maintainer, I want npm scope migration excluded from this implementation, so that the documentation site does not silently rename public code contracts.
50. As a project owner, I want the documentation implementation isolated from concurrent Renderer work, so that unrelated changes never enter the documentation branch.

## Implementation Decisions

- Build the public Documentation Site with VitePress inside a dedicated site directory rather than publishing the existing internal documentation tree directly.
- Use Simplified Chinese as the root locale. Preserve package names, TypeScript identifiers and code in English. Do not create an English content tree in the first release.
- Extend the default VitePress theme only where needed for a product-facing homepage, capability cards and CFlow-specific visual language. Keep documentation navigation, search, code blocks and responsive layout on the maintained default theme.
- Use a text-based CFlow mark in the first release. Do not invent a permanent logo or brand system without a separate design decision.
- Organize navigation around Getting Started, five capability families, a complete module index, current status and Roadmap.
- Include all 15 currently committed workspace packages. Do not include uncommitted or planned Renderer Providers, Interaction packages, framework adapters or presets.
- Group packages into Foundations; Graph State; Execution and History; Layout; and Rendering Contract. Keep one detail page per package beneath those product-facing groups.
- Use a consistent module-page contract: problem, use when, capabilities, dependencies and composition, public entry points, lifecycle or state semantics, limitations and non-goals, example, and verification evidence.
- Treat current public exports, package metadata, tests and committed implementation as capability evidence. Use the glossary and accepted ADRs for terminology and rationale. Do not use target architecture as proof that a capability exists.
- Keep the public core facade as the Quick Start entry point. Narrow package imports remain advanced paths documented on module pages.
- Make the first Quick Start a real headless Runtime path that installs Kernel capability, commits one Node, observes revision one and disposes all resources.
- Run the exact Quick Start source during documentation checks rather than maintaining an unexecuted copy-only example.
- State that this project's packages are not yet available under their declared npm names. Use source checkout instructions and never show `bun add @cflow/core` while the registry name points to another project.
- Centralize package presentation metadata and temporary publication status where practical. Do not create a Runtime capability registry or change Plugin discovery semantics.
- Keep package README files as concise repository and package-manager entry points. Link them to canonical site pages instead of copying full module narratives in both places.
- Add one top-level `docs:check` command that executes the Quick Start and performs a VitePress production build. Make the repository-wide check call that seam.
- Enable VitePress local search in the production build without introducing an external search service.
- Publish static output through GitHub Pages from the main branch using the same production build seam and the repository subpath base setting.
- Implement in an isolated feature worktree so concurrent Renderer design and implementation changes remain untouched.

## Testing Decisions

- Use one highest-level automated documentation seam: `docs:check`. A good test observes public behavior by running the documented public Quick Start and building the same static site that will be deployed.
- Execute the Quick Start against real core facade exports, Plugin Host lifecycle and Kernel Service behavior. The expected external result is one successful commit at revision one containing one Node, followed by clean Host disposal.
- Reuse the existing core facade integration tests and Runtime Plugin lifecycle tests as prior art. Do not test private VitePress helpers or duplicate Kernel internals in documentation tests.
- Let the VitePress production build validate content parsing, route generation, static assets and internal links. Dead internal links and invalid configuration must fail rather than be ignored.
- Make the repository-wide check invoke `docs:check`, so all later module-content tickets inherit a green documentation gate.
- Inspect the built site in a real browser at desktop and mobile widths. Verify homepage hierarchy, Quick Start visibility, capability navigation, module navigation, search, code readability, dark mode and absence of horizontal overflow.
- Verify that no public page contains the unsafe npm installation command while the package identity conflict remains.
- Verify that the module index contains exactly the committed package set selected by this specification and that every module route is reachable through capability navigation.
- Verify the GitHub Pages workflow uses the same production build command and correct repository subpath. Do not introduce a separate deployment-only success path.
- Finish with repository formatting, type checking, tests, builds, documentation check and whitespace/conflict-marker inspection.

## Out of Scope

- Renaming or publishing packages under a new npm scope.
- Claiming, transferring or modifying the existing `@cflow` npm scope.
- A concrete Renderer Provider, visible canvas demo, Interaction package, framework adapter or preset.
- Generating API Reference from TypeScript declarations.
- A Runtime capability catalog, Provider registry, default Provider or recommendation engine.
- English translation, additional locales or mixed bilingual prose.
- Blog, changelog portal, versioned documentation or migration-guide system.
- Custom domain setup, analytics, hosted search, CMS or authenticated content.
- Permanent logo, illustration system or complete brand identity.
- Publishing internal ADRs and target architecture as current product documentation.
- Modifying unrelated concurrent Renderer work.

## Further Notes

- The public npm registry currently resolves `@cflow/core` to an unrelated project. This is a launch constraint, not a documentation-generation error, and must remain visible until package identity changes.
- The current repository has no committed concrete Renderer Provider. Rendering documentation therefore explains the backend-neutral protocol and Runtime adapter only.
- Existing README examples are useful source material but not authoritative when they omit Activation waiting, cleanup or contradict committed implementation.
- Public claims should distinguish package dependency, Runtime Service dependency and product capability; those relationships are related but not interchangeable.
- Technology and directory choices are intentionally reversible and do not warrant a separate ADR at this stage. The stable domain boundary is the Documentation Site's role as a public knowledge surface rather than a Runtime registry.

## Comments

- 2026-08-19：用户澄清“中文优先”表示简体中文作为默认 locale，同时必须提供完整 English locale 与语言切换；不是中文单语首发。该修正取代 Out of Scope 中的 English translation 限制，并由 ticket 09 交付。
