import { createFileRoute } from '@tanstack/react-router';
import {
  ClipboardX,
  Download,
  Focus,
  History as HistoryIcon,
  KeyboardOff,
  Maximize2,
  Minus,
  Network,
  Plus,
  Redo2,
  RotateCcw,
  Undo2,
  Upload,
} from 'lucide-react';
import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from 'react';

import {
  useHistorySnapshot,
  useKernelView,
  useRuntimeMount,
  useSessionSnapshot,
  type RuntimeMountFailureReporter,
} from '@nodebraid/adapter-react';
import { describeError, redoCommand, undoCommand } from '@nodebraid/core';

import { Badge } from '@/components/ui/badge';
import { NodeCreation, NodeDataEditor } from '@/components/node-authoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  createExampleRuntime,
  exampleLayoutCommand,
  type ExampleRuntime,
} from '@/example-runtime/create-example-runtime';
import { downloadExampleDocument, restoreExampleDocument } from '@/example-runtime/document-adapters';
import { useClipboardFailure } from '@/example-runtime/use-clipboard-failure';
import { fitViewport, zoomViewportAtCenter } from '@/example-runtime/viewport';

type Language = 'en' | 'zh';

export const Route = createFileRoute('/basic-svg')({
  validateSearch(search): Readonly<{ lang: Language }> {
    return { lang: search.lang === 'zh' ? 'zh' : 'en' };
  },
  component: BasicSvgExample,
});

function BasicSvgExample() {
  const { lang } = Route.useSearch();
  const [generation, setGeneration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [placing, setPlacing] = useState(false);
  const reportFailure = (error: unknown) => {
    setErrorMessage(describeExampleError(error));
    queueMicrotask(() => {
      throw error;
    });
  };
  const reportMountFailure = useCallback<RuntimeMountFailureReporter>(({ error }) => {
    queueMicrotask(() => {
      throw error;
    });
  }, []);
  const runtimeFactory = useCallback((target: SVGSVGElement) => createExampleRuntime(target), [generation]);
  const mount = useRuntimeMount(runtimeFactory, reportMountFailure);
  const ready = mount.snapshot.status === 'ready' ? mount.snapshot : undefined;
  const status = mount.snapshot.status === 'pending' ? 'loading' : mount.snapshot.status;
  const displayedError =
    mount.snapshot.status === 'failed' ? describeExampleError(mount.snapshot.failure.error) : errorMessage;

  const copy = translations[lang];

  return (
    <main className="basic-svg-page" data-example-status={status} data-node-placement={placing}>
      <section className="example-introduction">
        <p className="eyebrow">Interactive Example</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </section>
      <div className="example-workspace">
        <section className="canvas-column">
          {ready ? (
            <>
              <NodeCreation key={generation} runtime={ready.runtime} lang={lang} onPlacementChange={setPlacing} />
              <CanvasToolbar
                copy={copy}
                runtime={ready.runtime}
                target={ready.target}
                onResetExample={() => {
                  setErrorMessage(undefined);
                  setGeneration((value) => value + 1);
                }}
                onError={reportFailure}
                onFileError={(error) => setErrorMessage(error === undefined ? undefined : describeExampleError(error))}
              />
            </>
          ) : null}
          <section className="canvas-frame" aria-label={copy.canvasLabel}>
            <svg ref={mount.ref} className="canvas-target" width="960" height="640" tabIndex={0} />
          </section>
        </section>
        <aside className="example-sidebar">
          {ready ? <NodeDataEditor key={generation} runtime={ready.runtime} lang={lang} /> : null}
          {ready ? (
            <RuntimeStatus copy={copy} runtime={ready.runtime} />
          ) : (
            <LoadingStatus copy={copy} status={mount.snapshot.status === 'failed' ? 'failed' : 'loading'} />
          )}
          {displayedError ? (
            <Card className="error-card" role="alert">
              <CardHeader>
                <CardTitle>{copy.error}</CardTitle>
                <CardDescription>{displayedError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>{copy.instructions}</CardTitle>
              <CardDescription>{copy.instructionsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="instructions-list">
                {copy.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

interface CanvasToolbarProps {
  readonly copy: Copy;
  readonly runtime: ExampleRuntime;
  readonly target: SVGSVGElement;
  readonly onResetExample: () => void;
  readonly onError: (error: unknown) => void;
  readonly onFileError: (error: unknown) => void;
}

function CanvasToolbar({ copy, runtime, target, onResetExample, onError, onFileError }: CanvasToolbarProps) {
  const [clipboardShortcutsEnabled, setClipboardShortcutsEnabled] = useState(true);
  const [duplicateShortcutEnabled, setDuplicateShortcutEnabled] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const history = useHistorySnapshot(runtime.history);
  const run = (operation: () => void | Promise<void>) => {
    try {
      void Promise.resolve(operation()).catch(onError);
    } catch (error) {
      onError(error);
    }
  };

  return (
    <div className="canvas-toolbar" role="toolbar" aria-label={copy.toolbar}>
      <ToolbarButton
        label={copy.undo}
        icon={<Undo2 />}
        disabled={!history.canUndo}
        onClick={() => run(async () => void (await runtime.commands.execute(undoCommand, undefined)))}
      />
      <ToolbarButton
        label={copy.redo}
        icon={<Redo2 />}
        disabled={!history.canRedo}
        onClick={() => run(async () => void (await runtime.commands.execute(redoCommand, undefined)))}
      />
      <ToolbarButton
        label={copy.autoLayout}
        icon={<Network />}
        onClick={() =>
          run(
            async () =>
              void (await runtime.commands.execute(exampleLayoutCommand, {
                mode: 'full',
                fixedNodeIds: [],
                config: { direction: 'LR' },
              })),
          )
        }
      />
      <Separator orientation="vertical" className="toolbar-separator" />
      <ToolbarButton label={copy.zoomIn} icon={<Plus />} onClick={() => zoomAtCenter(runtime, target, 1.2)} />
      <ToolbarButton label={copy.zoomOut} icon={<Minus />} onClick={() => zoomAtCenter(runtime, target, 1 / 1.2)} />
      <ToolbarButton
        label={copy.fitView}
        icon={<Maximize2 />}
        disabled={runtime.kernel.read().snapshot.nodes.length === 0}
        onClick={() => fitView(runtime, target)}
      />
      <ToolbarButton
        label={copy.resetView}
        icon={<Focus />}
        onClick={() => runtime.session.setViewport({ x: 0, y: 0, zoom: 1 })}
      />
      <Separator orientation="vertical" className="toolbar-separator" />
      <ToolbarButton
        label={copy.exportDocument}
        icon={<Download />}
        onClick={() => {
          try {
            downloadExampleDocument(runtime);
          } catch (error) {
            onFileError(error);
          }
        }}
      />
      <ToolbarButton
        label={copy.importDocument}
        icon={<Upload />}
        disabled={importing}
        onClick={() => fileInput.current?.click()}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label={copy.documentFile}
        hidden
        disabled={importing}
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          setImporting(true);
          onFileError(undefined);
          try {
            await restoreExampleDocument(runtime, await file.text());
          } catch (error) {
            onFileError(error);
          } finally {
            setImporting(false);
          }
        }}
      />
      <Separator orientation="vertical" className="toolbar-separator" />
      <ToolbarButton label={copy.resetExample} icon={<RotateCcw />} onClick={onResetExample} />
      <ToolbarButton
        label={copy.disableClipboardShortcuts}
        icon={<ClipboardX />}
        disabled={!clipboardShortcutsEnabled}
        onClick={() =>
          run(async () => {
            await runtime.disposeClipboardShortcuts();
            setClipboardShortcutsEnabled(false);
            target.focus();
          })
        }
      />
      <ToolbarButton
        label={copy.disableDuplicateShortcut}
        icon={<KeyboardOff />}
        disabled={!duplicateShortcutEnabled}
        onClick={() =>
          run(async () => {
            await runtime.disposeDuplicateShortcut();
            setDuplicateShortcutEnabled(false);
            target.focus();
          })
        }
      />
    </div>
  );
}

function ToolbarButton({ label, icon, ...props }: ComponentProps<typeof Button> & { label: string; icon: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button aria-label={label} data-example-control variant="outline" size="icon" {...props}>
            {icon}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function RuntimeStatus({ copy, runtime }: Readonly<{ copy: Copy; runtime: ExampleRuntime }>) {
  const view = useKernelView(runtime.kernel);
  const session = useSessionSnapshot(runtime.session);
  const history = useHistorySnapshot(runtime.history);
  const clipboardFailure = useClipboardFailure(runtime);
  const selected = [...session.selection.nodeIds, ...session.selection.edgeIds];

  return (
    <Card>
      <CardHeader>
        <div className="status-heading">
          <CardTitle>{copy.runtime}</CardTitle>
          <Badge variant="secondary">{copy.ready}</Badge>
        </div>
        <CardDescription>{copy.runtimeDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="metrics-grid">
          <Metric label={copy.revision} name="revision" value={String(view.snapshot.revision)} />
          <Metric label={copy.nodes} name="nodes" value={String(view.snapshot.nodes.length)} />
          <Metric label={copy.edges} name="edges" value={String(view.snapshot.edges.length)} />
          <Metric
            label={copy.selection}
            name="selection"
            value={selected.length === 0 ? copy.none : selected.join(', ')}
          />
          <Metric label={copy.zoom} name="zoom" value={`${session.viewport.zoom.toFixed(2)}×`} />
          <Metric
            label={copy.history}
            name="history"
            value={`${history.canUndo ? copy.undo : '—'} / ${history.canRedo ? copy.redo : '—'}`}
            icon={<HistoryIcon />}
          />
          <Metric
            label={copy.clipboardFailure}
            name="clipboard-failure"
            value={clipboardFailure ? `${clipboardFailure.code}:${clipboardFailure.causeName}` : copy.none}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function LoadingStatus({ copy, status }: Readonly<{ copy: Copy; status: 'loading' | 'failed' }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.runtime}</CardTitle>
        <CardDescription>{status === 'failed' ? copy.failed : copy.loading}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Metric({
  label,
  name,
  value,
  icon,
}: Readonly<{ label: string; name: string; value: string; icon?: ReactNode }>) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd data-example-metric={name}>
        {icon}
        {value}
      </dd>
    </div>
  );
}

function zoomAtCenter(runtime: ExampleRuntime, target: SVGSVGElement, factor: number) {
  const current = runtime.session.getSnapshot().viewport;
  const bounds = target.getBoundingClientRect();
  runtime.session.setViewport(zoomViewportAtCenter(current, bounds, factor));
}

function fitView(runtime: ExampleRuntime, target: SVGSVGElement) {
  const nodes = runtime.kernel.read().snapshot.nodes;
  const bounds = target.getBoundingClientRect();
  const viewport = fitViewport(nodes, bounds);
  if (viewport) runtime.session.setViewport(viewport);
}

function describeExampleError(error: unknown): string {
  const description = describeError(error);
  if ('message' in description) return description.message;
  if (description.kind === 'circular') return `Circular error reference: ${description.reference}`;
  return `Unknown ${description.type} failure.`;
}

interface Copy {
  readonly title: string;
  readonly description: string;
  readonly canvasLabel: string;
  readonly toolbar: string;
  readonly undo: string;
  readonly redo: string;
  readonly autoLayout: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly fitView: string;
  readonly resetView: string;
  readonly resetExample: string;
  readonly exportDocument: string;
  readonly importDocument: string;
  readonly documentFile: string;
  readonly disableClipboardShortcuts: string;
  readonly disableDuplicateShortcut: string;
  readonly runtime: string;
  readonly runtimeDescription: string;
  readonly ready: string;
  readonly loading: string;
  readonly failed: string;
  readonly revision: string;
  readonly nodes: string;
  readonly edges: string;
  readonly selection: string;
  readonly zoom: string;
  readonly history: string;
  readonly clipboardFailure: string;
  readonly none: string;
  readonly instructions: string;
  readonly instructionsDescription: string;
  readonly steps: readonly string[];
  readonly error: string;
}

const translations: Readonly<Record<Language, Copy>> = {
  en: {
    title: 'Basic SVG Canvas',
    description:
      'Create and customize nodes, edit their data, and combine selection, clipboard, layout, connections, and file saving.',
    canvasLabel: 'Interactive canvas',
    toolbar: 'Canvas controls',
    undo: 'Undo',
    redo: 'Redo',
    autoLayout: 'Auto layout',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fitView: 'Fit view',
    resetView: 'Reset view',
    resetExample: 'Reset example',
    exportDocument: 'Export document',
    importDocument: 'Import document',
    documentFile: 'Document file',
    disableClipboardShortcuts: 'Disable clipboard shortcuts',
    disableDuplicateShortcut: 'Disable duplicate shortcut',
    runtime: 'Runtime state',
    runtimeDescription: 'Observed only through public NodeBraid services.',
    ready: 'Ready',
    loading: 'Starting the Canvas Runtime…',
    failed: 'The Canvas Runtime failed.',
    revision: 'Revision',
    nodes: 'Nodes',
    edges: 'Edges',
    selection: 'Selection',
    zoom: 'Zoom',
    history: 'History',
    clipboardFailure: 'Clipboard failure',
    none: 'None',
    instructions: 'Try the interaction loop',
    instructionsDescription: 'Every stable graph change becomes a Kernel Commit.',
    steps: [
      'Choose Card or Note, then click empty canvas to place one node. Esc cancels placement.',
      'Edit the selected node in Node properties. Apply once, or cancel the draft without changing the canvas.',
      'Click a node to select it.',
      'Drag across empty canvas space to box-select intersecting nodes.',
      'Press Ctrl/Cmd+C and Ctrl/Cmd+V while the canvas is focused to copy and paste the Selection.',
      'Press Ctrl/Cmd+D while the canvas is focused to duplicate the Selection.',
      'Press Delete while the canvas is focused to remove the Selection.',
      'Drag a selected node.',
      'Use Auto layout to arrange nodes from left to right; Undo restores their previous positions.',
      'Drag from a source anchor to a target anchor.',
      'Pan the canvas or use the mouse wheel to zoom.',
      'Export your canvas to a file, then import it to replace the current canvas. Undo starts with your next edit.',
    ],
    error: 'Runtime error',
  },
  zh: {
    title: '基础 SVG 画布',
    description: '创建与自定义节点、编辑节点数据，并组合选择、剪贴板、布局、连接与文件保存能力。',
    canvasLabel: '交互画布',
    toolbar: '画布控制',
    undo: '撤销',
    redo: '重做',
    autoLayout: '自动布局',
    zoomIn: '放大',
    zoomOut: '缩小',
    fitView: '适应画布',
    resetView: '重置视图',
    resetExample: '重置示例',
    exportDocument: '导出文档',
    importDocument: '导入文档',
    documentFile: '文档文件',
    disableClipboardShortcuts: '停用剪贴板快捷键',
    disableDuplicateShortcut: '停用复制快捷键',
    runtime: 'Runtime 状态',
    runtimeDescription: '只通过 NodeBraid 公共 Service 观察。',
    ready: '已就绪',
    loading: '正在启动 Canvas Runtime…',
    failed: 'Canvas Runtime 启动失败。',
    revision: 'Revision',
    nodes: 'Node',
    edges: 'Edge',
    selection: 'Selection',
    zoom: '缩放',
    history: 'History',
    clipboardFailure: 'Clipboard failure',
    none: '无',
    instructions: '体验完整交互闭环',
    instructionsDescription: '每次稳定图变化都会成为一个 Kernel Commit。',
    steps: [
      '选择卡片或便笺，然后点击画布空白处放置一个节点；按 Esc 取消放置。',
      '在节点属性中编辑，应用后提交一次修改，或取消草稿。',
      '点击 Node 完成选择。',
      '从画布空白处拖动，框选相交的 Node。',
      '画布获得焦点后按 Ctrl/Cmd+C 与 Ctrl/Cmd+V，复制并粘贴当前 Selection。',
      '画布获得焦点后按 Ctrl/Cmd+D，复制当前 Selection。',
      '画布获得焦点后按 Delete，删除当前 Selection。',
      '拖动已选择的 Node。',
      '点击自动布局，从左到右排列 Node；撤销可恢复布局前的位置。',
      '从 source anchor 拖向 target anchor。',
      '拖动画布或使用滚轮缩放。',
      '将画布导出为文件，再导入以替换当前画布；撤销从导入后的新编辑开始记录。',
    ],
    error: 'Runtime 错误',
  },
};
