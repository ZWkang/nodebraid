import { useState } from 'react';
import { useSessionSnapshot, useKernelView } from '@nodebraid/adapter-react';
import type { CanvasEdge } from '@nodebraid/core';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { applyEdgeLabel } from '../example-runtime/edge-label';
import { acceptExampleData } from '../example-runtime/example-data-codec';
import type { ExampleRuntime } from '../example-runtime/create-example-runtime';

export function EdgeLabelEditor({ runtime, lang }: { runtime: ExampleRuntime; lang: 'en' | 'zh' }) {
  const { selection } = useSessionSnapshot(runtime.session);
  const view = useKernelView(runtime.kernel);
  const edge =
    selection.edgeIds.length === 1 && !selection.nodeIds.length ? view.query.getEdge(selection.edgeIds[0]!) : undefined;
  const [draft, setDraft] = useState<{ source: CanvasEdge; label: string }>();
  const [failure, setFailure] = useState<string>();
  const current = draft?.source ?? edge;
  if (!current) return null;
  const original = acceptExampleData(current.data)?.label ?? '';
  const label = draft?.label ?? original;
  const reset = () => {
    setDraft(undefined);
    setFailure(undefined);
  };
  const apply = () => {
    if (!draft) return;
    try {
      applyEdgeLabel(runtime.kernel, draft.source, draft.label);
      reset();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    }
  };
  const switched = !!draft && draft.source.id !== edge?.id;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang === 'zh' ? '连线属性' : 'Edge properties'}</CardTitle>
      </CardHeader>
      <CardContent>
        <label>
          {lang === 'zh' ? '连线标签' : 'Edge label'}
          <input
            aria-label={lang === 'zh' ? '连线标签' : 'Edge label'}
            value={label}
            onChange={(e) => {
              if (e.target.value === original) reset();
              else setDraft({ source: current, label: e.target.value });
            }}
          />
        </label>
        <Button disabled={!draft} onClick={apply}>
          {lang === 'zh' ? '应用标签' : 'Apply label'}
        </Button>
        <Button disabled={!draft} variant="outline" onClick={reset}>
          {lang === 'zh' ? '取消标签编辑' : 'Cancel label edit'}
        </Button>
        {switched && (
          <p>
            {lang === 'zh' ? '正在编辑原连线' : 'Editing the previously selected edge'} · {current.id}
          </p>
        )}
        {failure && <p role="alert">{failure}</p>}
      </CardContent>
    </Card>
  );
}
