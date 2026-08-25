import { createFileRoute } from '@tanstack/react-router';
import { Focus, History as HistoryIcon, Maximize2, Minus, Plus, Redo2, RotateCcw, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react';

import { describeError, redoCommand, undoCommand, type Viewport } from '@nodebraid/core';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type ExampleRuntime } from '@/example-runtime/create-example-runtime';
import { runtimeMountCoordinator } from '@/example-runtime/runtime-mount-coordinator';
import {
  useHistorySnapshot,
  useKernelView,
  useOptionalHistorySnapshot,
  useSessionSnapshot,
} from '@/hooks/use-runtime-snapshots';

type Language = 'en' | 'zh';

export const Route = createFileRoute('/basic-svg')({
  validateSearch(search): Readonly<{ lang: Language }> {
    return { lang: search.lang === 'zh' ? 'zh' : 'en' };
  },
  component: BasicSvgExample,
});

function BasicSvgExample() {
  const { lang } = Route.useSearch();
  const target = useRef<SVGSVGElement>(null);
  const [generation, setGeneration] = useState(0);
  const [runtime, setRuntime] = useState<ExampleRuntime>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const reportFailure = (error: unknown) => {
    setErrorMessage(describeExampleError(error));
    queueMicrotask(() => {
      throw error;
    });
  };

  useEffect(() => {
    const element = target.current;
    if (!element) throw new Error('Basic SVG Example target is missing.');
    setStatus('loading');
    setRuntime(undefined);
    setErrorMessage(undefined);
    return runtimeMountCoordinator.mount(
      element,
      (nextRuntime) => {
        setRuntime(nextRuntime);
        setStatus('ready');
      },
      (error) => {
        setStatus('failed');
        reportFailure(error);
      },
    );
  }, [generation]);

  const copy = translations[lang];

  return (
    <main className="basic-svg-page" data-example-status={status}>
      <section className="example-introduction">
        <p className="eyebrow">Interactive Example</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </section>
      <div className="example-workspace">
        <section className="canvas-column">
          <CanvasToolbar
            copy={copy}
            runtime={runtime}
            target={target}
            onResetExample={() => setGeneration((value) => value + 1)}
            onError={reportFailure}
          />
          <section className="canvas-frame" aria-label={copy.canvasLabel}>
            <svg ref={target} className="canvas-target" width="960" height="640" tabIndex={0} />
          </section>
        </section>
        <aside className="example-sidebar">
          {runtime ? <RuntimeStatus copy={copy} runtime={runtime} /> : <LoadingStatus copy={copy} status={status} />}
          {errorMessage ? (
            <Card className="error-card" role="alert">
              <CardHeader>
                <CardTitle>{copy.error}</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
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
  readonly runtime: ExampleRuntime | undefined;
  readonly target: RefObject<SVGSVGElement | null>;
  readonly onResetExample: () => void;
  readonly onError: (error: unknown) => void;
}

function CanvasToolbar({ copy, runtime, target, onResetExample, onError }: CanvasToolbarProps) {
  const disabled = runtime === undefined;
  const history = useOptionalHistorySnapshot(runtime);
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
        disabled={disabled || !history.canUndo}
        onClick={() => run(async () => void (await runtime?.commands.execute(undoCommand, undefined)))}
      />
      <ToolbarButton
        label={copy.redo}
        icon={<Redo2 />}
        disabled={disabled || !history.canRedo}
        onClick={() => run(async () => void (await runtime?.commands.execute(redoCommand, undefined)))}
      />
      <Separator orientation="vertical" className="toolbar-separator" />
      <ToolbarButton
        label={copy.zoomIn}
        icon={<Plus />}
        disabled={disabled}
        onClick={() => runtime && target.current && zoomAtCenter(runtime, target.current, 1.2)}
      />
      <ToolbarButton
        label={copy.zoomOut}
        icon={<Minus />}
        disabled={disabled}
        onClick={() => runtime && target.current && zoomAtCenter(runtime, target.current, 1 / 1.2)}
      />
      <ToolbarButton
        label={copy.fitView}
        icon={<Maximize2 />}
        disabled={disabled || runtime?.kernel.read().snapshot.nodes.length === 0}
        onClick={() => runtime && target.current && fitView(runtime, target.current)}
      />
      <ToolbarButton
        label={copy.resetView}
        icon={<Focus />}
        disabled={disabled}
        onClick={() => runtime?.session.setViewport({ x: 0, y: 0, zoom: 1 })}
      />
      <Separator orientation="vertical" className="toolbar-separator" />
      <ToolbarButton label={copy.resetExample} icon={<RotateCcw />} disabled={disabled} onClick={onResetExample} />
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
  const view = useKernelView(runtime);
  const session = useSessionSnapshot(runtime);
  const history = useHistorySnapshot(runtime);
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
        </dl>
      </CardContent>
    </Card>
  );
}

function LoadingStatus({ copy, status }: Readonly<{ copy: Copy; status: 'loading' | 'ready' | 'failed' }>) {
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
  const anchor = { x: bounds.width / 2, y: bounds.height / 2 };
  const zoom = clamp(current.zoom * factor, 0.25, 4);
  const worldX = (anchor.x - current.x) / current.zoom;
  const worldY = (anchor.y - current.y) / current.zoom;
  runtime.session.setViewport({ x: anchor.x - worldX * zoom, y: anchor.y - worldY * zoom, zoom });
}

function fitView(runtime: ExampleRuntime, target: SVGSVGElement) {
  const nodes = runtime.kernel.read().snapshot.nodes;
  if (nodes.length === 0) return;
  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + (node.size?.width ?? 0)));
  const maxY = Math.max(...nodes.map((node) => node.position.y + (node.size?.height ?? 0)));
  const bounds = target.getBoundingClientRect();
  const padding = 48;
  const zoom = clamp(
    Math.min((bounds.width - padding * 2) / (maxX - minX), (bounds.height - padding * 2) / (maxY - minY)),
    0.25,
    4,
  );
  const viewport: Viewport = {
    x: (bounds.width - (maxX - minX) * zoom) / 2 - minX * zoom,
    y: (bounds.height - (maxY - minY) * zoom) / 2 - minY * zoom,
    zoom,
  };
  runtime.session.setViewport(viewport);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
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
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly fitView: string;
  readonly resetView: string;
  readonly resetExample: string;
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
  readonly none: string;
  readonly instructions: string;
  readonly instructionsDescription: string;
  readonly steps: readonly string[];
  readonly error: string;
}

const translations: Readonly<Record<Language, Copy>> = {
  en: {
    title: 'Basic SVG Canvas',
    description: 'Select, box-select, drag, pan, zoom, and connect one node anchor to another.',
    canvasLabel: 'Interactive canvas',
    toolbar: 'Canvas controls',
    undo: 'Undo',
    redo: 'Redo',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fitView: 'Fit view',
    resetView: 'Reset view',
    resetExample: 'Reset example',
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
    none: 'None',
    instructions: 'Try the interaction loop',
    instructionsDescription: 'Every stable graph change becomes a Kernel Commit.',
    steps: [
      'Click a node to select it.',
      'Drag across empty canvas space to box-select intersecting nodes.',
      'Drag a selected node.',
      'Drag from a source anchor to a target anchor.',
      'Pan the canvas or use the mouse wheel to zoom.',
    ],
    error: 'Runtime error',
  },
  zh: {
    title: '基础 SVG 画布',
    description: '选择、框选、拖动、平移、缩放，并从一个连接锚点拖到另一个锚点。',
    canvasLabel: '交互画布',
    toolbar: '画布控制',
    undo: '撤销',
    redo: '重做',
    zoomIn: '放大',
    zoomOut: '缩小',
    fitView: '适应画布',
    resetView: '重置视图',
    resetExample: '重置示例',
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
    none: '无',
    instructions: '体验完整交互闭环',
    instructionsDescription: '每次稳定图变化都会成为一个 Kernel Commit。',
    steps: [
      '点击 Node 完成选择。',
      '从画布空白处拖动，框选相交的 Node。',
      '拖动已选择的 Node。',
      '从 source anchor 拖向 target anchor。',
      '拖动画布或使用滚轮缩放。',
    ],
    error: 'Runtime 错误',
  },
};
