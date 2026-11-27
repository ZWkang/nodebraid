import { useEffect, useRef, useState } from 'react';
import { useSessionSnapshot } from '@nodebraid/adapter-react';
import { describeError, updateNodeDataCommand, type CanvasNode } from '@nodebraid/core';
import type { ExampleRuntime } from '../example-runtime/create-example-runtime';
import { acceptExampleData } from '../example-runtime/example-data-codec';

interface TitleDraft {
  readonly expectedNode: CanvasNode;
  readonly original: string;
  readonly label: string;
}

export function InlineNodeTitle({
  runtime,
  target,
  lang,
}: {
  runtime: ExampleRuntime;
  target: SVGSVGElement;
  lang: 'en' | 'zh';
}) {
  const [draft, setDraft] = useState<TitleDraft>();
  const [failure, setFailure] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const { viewport } = useSessionSnapshot(runtime.session);

  useEffect(() => {
    function open(event: MouseEvent) {
      if (draft && draft.label !== draft.original) {
        input.current?.focus();
        return;
      }
      const bounds = target.getBoundingClientRect();
      const hit = runtime.renderer.hitTest({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      if (hit?.type !== 'node') return;
      const node = runtime.kernel.read().query.getNode(hit.nodeId);
      if (!node) return;
      setFailure(undefined);
      const original = acceptExampleData(node.data)?.label ?? node.type;
      setDraft({ expectedNode: node, original, label: original });
    }
    target.addEventListener('dblclick', open);
    return () => target.removeEventListener('dblclick', open);
  }, [draft, runtime, target]);

  useEffect(() => {
    if (draft) input.current?.select();
  }, [draft?.expectedNode]);
  if (!draft) return null;
  const { position, size } = draft.expectedNode;
  const finish = () => {
    setDraft(undefined);
    setFailure(undefined);
    target.focus();
  };
  async function submit(edit: TitleDraft) {
    try {
      const expectedNode = edit.expectedNode;
      const data =
        edit.label === edit.original
          ? expectedNode.data
          : { label: edit.label, tags: acceptExampleData(expectedNode.data)?.tags ?? [] };
      await runtime.commands.execute(updateNodeDataCommand, { expectedNode, data });
      finish();
    } catch (error) {
      const description = describeError(error);
      setFailure('message' in description ? description.message : JSON.stringify(description));
    }
  }
  return (
    <div
      className="inline-node-title"
      style={{
        left: viewport.x + (position.x + (size?.width ?? 0) / 2) * viewport.zoom,
        top: viewport.y + (position.y + (size?.height ?? 0) / 2) * viewport.zoom,
      }}
    >
      <input
        ref={input}
        aria-label={lang === 'zh' ? '编辑节点标题' : 'Edit node title'}
        value={draft.label}
        onChange={(event) => setDraft({ ...draft, label: event.target.value })}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            void submit(draft);
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            finish();
          }
        }}
      />
      {failure && <span role="alert">{failure}</span>}
    </div>
  );
}
