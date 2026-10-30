import { useEffect, useRef, useState } from 'react';

import { useKernelView, useSessionSnapshot } from '@nodebraid/adapter-react';
import { describeError, type NodePlacement } from '@nodebraid/core';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import type { ExampleNodeType, ExampleRuntime } from '../example-runtime/create-example-runtime';
import {
  applyNodeDraft,
  createNodeDraft,
  projectNodeEditor,
  reconcileNodeDraft,
  type NodeDraft,
} from '../example-runtime/node-draft';

type Language = 'en' | 'zh';

export function NodeCreation({
  runtime,
  lang,
  onPlacementChange,
}: {
  readonly runtime: ExampleRuntime;
  readonly lang: Language;
  readonly onPlacementChange: (placing: boolean) => void;
}) {
  const copy = translations[lang];
  const [type, setType] = useState<ExampleNodeType>('step');
  const [placing, setPlacing] = useState(false);
  const [failure, setFailure] = useState<string>();
  const active = useRef<NodePlacement | undefined>(undefined);

  useEffect(() => () => active.current?.cancel(), [runtime]);

  const begin = () => {
    setFailure(undefined);
    try {
      const request = runtime.placement.begin(({ worldPoint }) =>
        runtime.materializeNode(type, worldPoint, type === 'note' ? copy.note : copy.card),
      );
      active.current = request;
      setPlacing(true);
      onPlacementChange(true);
      void request.result.then(
        () => finish(request),
        (error: unknown) => {
          if (active.current !== request) return;
          setFailure(errorMessage(error));
          finish(request);
        },
      );
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };
  const finish = (request: NodePlacement) => {
    if (active.current !== request) return;
    active.current = undefined;
    setPlacing(false);
    onPlacementChange(false);
  };

  return (
    <section className="node-creation" aria-label={copy.create} data-example-placement={placing ? 'waiting' : 'idle'}>
      <label>
        {copy.type}
        <select
          aria-label={copy.type}
          value={type}
          disabled={placing}
          onChange={(event) => setType(event.target.value === 'note' ? 'note' : 'step')}
        >
          <option value="step">{copy.card}</option>
          <option value="note">{copy.note}</option>
        </select>
      </label>
      {placing ? (
        <Button variant="outline" aria-label={copy.cancelPlacement} onClick={() => active.current?.cancel()}>
          {copy.cancelPlacement}
        </Button>
      ) : (
        <Button aria-label={copy.place} onClick={begin}>
          {copy.place}
        </Button>
      )}
      <p role="status">{placing ? copy.placing : copy.createHint}</p>
      {failure ? <p role="alert">{failure}</p> : null}
    </section>
  );
}

export function NodeDataEditor({ runtime, lang }: { readonly runtime: ExampleRuntime; readonly lang: Language }) {
  const copy = translations[lang];
  const view = useKernelView(runtime.kernel);
  const { selection } = useSessionSnapshot(runtime.session);
  const [draft, setDraft] = useState<NodeDraft>();
  const [failure, setFailure] = useState<string>();
  const [applying, setApplying] = useState(false);
  const { selected, current, dirty, switching, stale, afterApplyNodeId } = projectNodeEditor(view, selection, draft);

  useEffect(() => {
    setDraft((current) => reconcileNodeDraft(current, selected));
  }, [selected]);

  const loadSelected = () => {
    setDraft(selected ? createNodeDraft(selected) : undefined);
    setFailure(undefined);
  };
  const apply = async () => {
    if (!draft) return;
    setApplying(true);
    setFailure(undefined);
    try {
      setDraft(await applyNodeDraft(runtime, draft, afterApplyNodeId));
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="node-data-editor" data-example-editor-node={draft?.expectedNode.id ?? ''}>
      <CardHeader>
        <CardTitle>{copy.properties}</CardTitle>
        <CardDescription>
          {draft ? `${draft.expectedNode.type} · ${draft.expectedNode.id}` : copy.selectOne}
        </CardDescription>
      </CardHeader>
      {draft ? (
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void apply();
            }}
          >
            <label>
              {copy.label}
              <input
                aria-label={copy.label}
                value={draft.label}
                disabled={applying}
                onChange={(event) => setDraft({ ...draft, label: event.target.value })}
              />
            </label>
            <label>
              {copy.tags}
              <input
                aria-label={copy.tags}
                value={draft.tags}
                disabled={applying}
                onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
              />
            </label>
            <p className="node-editor-hint">{copy.draftHint}</p>
            {stale ? (
              <p role="alert" data-example-edit-conflict>
                {current ? copy.stale : copy.deleted}
              </p>
            ) : null}
            {failure ? (
              <p role="alert" data-example-edit-error>
                {failure}
              </p>
            ) : null}
            {switching ? (
              <div className="node-draft-switch" role="group" aria-label={copy.unsaved}>
                <p>{copy.switchPrompt}</p>
                <Button type="submit" disabled={applying} aria-label={copy.applySwitch}>
                  {copy.applySwitch}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={applying}
                  onClick={loadSelected}
                  aria-label={copy.discardSwitch}
                >
                  {copy.discardSwitch}
                </Button>
                {current ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={applying}
                    onClick={() => runtime.session.setSelection({ nodeIds: [current.id], edgeIds: [] })}
                    aria-label={copy.keepEditing}
                  >
                    {copy.keepEditing}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="node-editor-actions">
                <Button type="submit" disabled={!dirty || applying} aria-label={copy.apply}>
                  {copy.apply}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!dirty || applying}
                  onClick={loadSelected}
                  aria-label={copy.cancel}
                >
                  {copy.cancel}
                </Button>
              </div>
            )}
            {stale && current ? (
              <Button
                type="button"
                variant="outline"
                disabled={applying}
                aria-label={copy.reload}
                onClick={() => {
                  setDraft(createNodeDraft(current));
                  setFailure(undefined);
                }}
              >
                {copy.reload}
              </Button>
            ) : null}
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}

function errorMessage(error: unknown): string {
  const description = describeError(error);
  return 'message' in description ? description.message : JSON.stringify(description);
}

const translations = {
  en: {
    create: 'Create a node',
    type: 'Node type',
    card: 'Card',
    note: 'Note',
    place: 'Place node',
    cancelPlacement: 'Cancel placement',
    placing: 'Click empty canvas to place one node. Esc cancels. The click sets its top-left corner.',
    createHint: 'Choose a type, then place it on the canvas.',
    properties: 'Node properties',
    selectOne: 'Select one node to edit its data.',
    label: 'Node label',
    tags: 'Tags (JSON array)',
    draftHint: 'Changes stay in this form until you apply them. One Undo reverses the whole edit.',
    apply: 'Apply changes',
    cancel: 'Cancel changes',
    reload: 'Reload node',
    unsaved: 'Unsaved node changes',
    switchPrompt: 'Apply or discard this draft before editing the new selection.',
    applySwitch: 'Apply and switch',
    discardSwitch: 'Discard and switch',
    keepEditing: 'Keep editing',
    stale:
      'This node changed after editing began, including its position. Your draft is retained; reload the node before editing again.',
    deleted: 'This node was removed. Your draft is retained; discard it to edit the current selection.',
  },
  zh: {
    create: '创建节点',
    type: '节点类型',
    card: '卡片',
    note: '便笺',
    place: '放置节点',
    cancelPlacement: '取消放置',
    placing: '点击画布空白处放置一个节点，点击位置是左上角。按 Esc 取消。',
    createHint: '选择类型，然后在画布上放置。',
    properties: '节点属性',
    selectOne: '选择一个节点以编辑其数据。',
    label: '节点名称',
    tags: '标签（JSON 数组）',
    draftHint: '应用前修改只保留在表单中；一次撤销恢复整次编辑。',
    apply: '应用修改',
    cancel: '取消修改',
    reload: '重新载入节点',
    unsaved: '未应用的节点修改',
    switchPrompt: '切换编辑对象前，请应用或放弃当前草稿。',
    applySwitch: '应用并切换',
    discardSwitch: '放弃并切换',
    keepEditing: '继续编辑',
    stale: '编辑开始后此节点已发生变化（包括位置）。草稿仍保留，请重新载入节点后再编辑。',
    deleted: '此节点已被移除。草稿仍保留，放弃后可编辑当前选择。',
  },
} as const;
