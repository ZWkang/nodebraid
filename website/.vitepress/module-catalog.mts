export interface LocalizedText {
  readonly zh: string;
  readonly en: string;
}

export interface ModuleEntry {
  readonly name: string;
  readonly slug: string;
  readonly summary: LocalizedText;
}

export interface CapabilityGroup {
  readonly slug: string;
  readonly title: string;
  readonly summary: LocalizedText;
  readonly modules: readonly ModuleEntry[];
}

export const capabilityGroups: readonly CapabilityGroup[] = Object.freeze([
  {
    slug: 'foundations',
    title: 'Foundations',
    summary: {
      zh: '公共 facade、Plugin Host 生命周期与统一 Diagnostics contract。',
      en: 'The public facade, Plugin Host lifecycle, and unified Diagnostics contract.',
    },
    modules: [
      {
        name: '@cflow/core',
        slug: 'core',
        summary: { zh: '当前公共能力的统一 facade。', en: 'The unified facade for current public capabilities.' },
      },
      {
        name: '@cflow/runtime-cordis',
        slug: 'runtime-cordis',
        summary: { zh: 'CFlow-owned Plugin Host 与生命周期。', en: 'The CFlow-owned Plugin Host and lifecycle.' },
      },
      {
        name: '@cflow/diagnostics',
        slug: 'diagnostics',
        summary: {
          zh: '结构化错误与 Diagnostic Event 契约。',
          en: 'Structured errors and Diagnostic Event contracts.',
        },
      },
    ],
  },
  {
    slug: 'graph-state',
    title: 'Graph State',
    summary: {
      zh: '权威 Document、原子 Transaction 与本地 Session 状态。',
      en: 'The authoritative Document, atomic Transactions, and local Session state.',
    },
    modules: [
      {
        name: '@cflow/kernel',
        slug: 'kernel',
        summary: { zh: 'Renderer-independent 图内核。', en: 'The renderer-independent graph kernel.' },
      },
      {
        name: '@cflow/plugin-kernel',
        slug: 'plugin-kernel',
        summary: { zh: 'Kernel Runtime Service adapter。', en: 'The Kernel Runtime Service adapter.' },
      },
      {
        name: '@cflow/session-api',
        slug: 'session-api',
        summary: {
          zh: 'Selection、Viewport 与 Session Snapshot 值契约。',
          en: 'Selection, Viewport, and Session Snapshot value contracts.',
        },
      },
      {
        name: '@cflow/plugin-session',
        slug: 'plugin-session',
        summary: { zh: 'Session Runtime Plugin。', en: 'The Session Runtime Plugin.' },
      },
    ],
  },
  {
    slug: 'execution-history',
    title: 'Execution & History',
    summary: {
      zh: '强类型行为执行与 Document Undo/Redo。',
      en: 'Strongly typed behavior execution and Document Undo/Redo.',
    },
    modules: [
      {
        name: '@cflow/plugin-command',
        slug: 'plugin-command',
        summary: { zh: 'Activation-scoped typed Command Service。', en: 'An Activation-scoped typed Command Service.' },
      },
      {
        name: '@cflow/plugin-history',
        slug: 'plugin-history',
        summary: { zh: 'Commit-based History Runtime Plugin。', en: 'A Commit-based History Runtime Plugin.' },
      },
    ],
  },
  {
    slug: 'layout',
    title: 'Layout',
    summary: {
      zh: 'Provider-neutral Layout contract、Runtime integration 与 concrete Providers。',
      en: 'Provider-neutral Layout contracts, Runtime integration, and concrete Providers.',
    },
    modules: [
      {
        name: '@cflow/layout-api',
        slug: 'layout-api',
        summary: {
          zh: 'Layout Input、Engine、Proposal 与 validation。',
          en: 'Layout Input, Engine, Proposal, and validation.',
        },
      },
      {
        name: '@cflow/plugin-layout',
        slug: 'plugin-layout',
        summary: { zh: 'Layout Runtime Command integration。', en: 'Layout Runtime Command integration.' },
      },
      {
        name: '@cflow/layout-dagre',
        slug: 'layout-dagre',
        summary: {
          zh: 'Dagre whole-canvas full Layout Provider。',
          en: 'The Dagre whole-canvas full Layout Provider.',
        },
      },
      {
        name: '@cflow/layout-elk',
        slug: 'layout-elk',
        summary: {
          zh: 'ELK full、incremental 与 Fixed Node Provider。',
          en: 'The ELK full, incremental, and Fixed Node Provider.',
        },
      },
    ],
  },
  {
    slug: 'interaction',
    title: 'Interaction',
    summary: {
      zh: 'Backend-neutral Preview 值与输入到语义行为的 Runtime 解释。',
      en: 'Backend-neutral Preview values and Runtime interpretation from input to semantic behavior.',
    },
    modules: [
      {
        name: '@cflow/interaction-api',
        slug: 'interaction-api',
        summary: {
          zh: 'Node Drag 与 Viewport Pan Projection 值契约。',
          en: 'Node Drag and Viewport Pan Projection value contracts.',
        },
      },
      {
        name: '@cflow/plugin-interaction',
        slug: 'plugin-interaction',
        summary: {
          zh: 'Selection、Drag、Pan 与 Wheel Zoom Runtime。',
          en: 'The Selection, Drag, Pan, and Wheel Zoom Runtime.',
        },
      },
    ],
  },
  {
    slug: 'rendering-contract',
    title: 'Rendering Contract',
    summary: {
      zh: 'Backend-neutral Renderer protocol 与 Runtime synchronization。',
      en: 'The backend-neutral Renderer protocol and Runtime synchronization.',
    },
    modules: [
      {
        name: '@cflow/renderer-api',
        slug: 'renderer-api',
        summary: { zh: 'Renderer Provider contract。', en: 'The Renderer Provider contract.' },
      },
      {
        name: '@cflow/plugin-renderer',
        slug: 'plugin-renderer',
        summary: { zh: 'Renderer Runtime adapter。', en: 'The Renderer Runtime adapter.' },
      },
      {
        name: '@cflow/renderer-svg',
        slug: 'renderer-svg',
        summary: {
          zh: '参考级官方 SVG Renderer Provider。',
          en: 'The reference-quality official SVG Renderer Provider.',
        },
      },
    ],
  },
]);

export const modules = Object.freeze(capabilityGroups.flatMap((group) => group.modules));
