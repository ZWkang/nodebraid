import { expect, test } from 'bun:test';
import { createCanvasKernel, edgeId, nodeId, type CanvasNode } from '@nodebraid/core';

import {
  createNodeDraft,
  isNodeDraftDirty,
  materializeNodeDraft,
  projectNodeEditor,
  reconcileNodeDraft,
} from '../src/example-runtime/node-draft';

const source = {
  id: 'draft-node',
  type: 'application-defined',
  position: { x: 1, y: 2 },
  data: Object.freeze({ label: 'Original', tags: Object.freeze(['comma,inside', 'line\nbreak', '中文']) }),
} as CanvasNode;

test('an unchanged application form preserves the original opaque data, including null', () => {
  const draft = createNodeDraft(source);
  expect(isNodeDraftDirty(draft)).toBe(false);
  expect(materializeNodeDraft(draft)).toBe(source.data);
  const empty = createNodeDraft({ ...source, data: null });
  expect(materializeNodeDraft(empty)).toBeNull();
});

test('editing a label preserves exact tag values without mutating the source', () => {
  const draft = { ...createNodeDraft(source), label: 'Changed' };
  expect(isNodeDraftDirty(draft)).toBe(true);
  expect(materializeNodeDraft(draft)).toEqual({ label: 'Changed', tags: ['comma,inside', 'line\nbreak', '中文'] });
  expect(source.data).toEqual({ label: 'Original', tags: ['comma,inside', 'line\nbreak', '中文'] });
});

test('invalid application tag input fails before a Node Command is called', () => {
  expect(() => materializeNodeDraft({ ...createNodeDraft(source), tags: '[' })).toThrow(SyntaxError);
  expect(() => materializeNodeDraft({ ...createNodeDraft(source), tags: '[1]' })).toThrow(TypeError);
});

test('formatting-only tag changes preserve the original data reference', () => {
  const draft = createNodeDraft(source);
  expect(materializeNodeDraft({ ...draft, tags: JSON.stringify(JSON.parse(draft.tags), null, 2) })).toBe(source.data);
});

test('clean drafts follow selection while unsaved input remains bound to its source', () => {
  const draft = createNodeDraft(source);
  const selected = { ...source, id: 'other-node', data: null } as CanvasNode;
  expect(reconcileNodeDraft(draft, source)).toBe(draft);
  expect(reconcileNodeDraft(draft, selected)).toEqual(createNodeDraft(selected));
  expect(reconcileNodeDraft(draft, undefined)).toBeUndefined();
  expect(reconcileNodeDraft(undefined, selected)).toEqual(createNodeDraft(selected));

  const edited = { ...draft, label: 'Unsaved' };
  expect(reconcileNodeDraft(edited, selected)).toBe(edited);
  expect(reconcileNodeDraft(edited, undefined)).toBe(edited);
  expect(reconcileNodeDraft(edited, { ...source, position: { x: 30, y: 40 } })).toBe(edited);
});

test('the editor only selects a single Node and keeps an explicit apply-and-switch target', () => {
  const kernel = createCanvasKernel();
  const other = { ...source, id: nodeId('other-node'), data: null };
  kernel.transact((transaction) => {
    transaction.nodes.add(source);
    transaction.nodes.add(other);
    transaction.edges.add({
      id: edgeId('connection'),
      type: 'flow',
      source: { nodeId: source.id },
      target: { nodeId: other.id },
      data: null,
    });
  });
  const view = kernel.read();
  const current = view.query.getNode(source.id)!;
  const draft = createNodeDraft(current);
  const selected = projectNodeEditor(view, { nodeIds: [source.id], edgeIds: [] }, draft);
  expect(selected.selected).toBe(current);
  expect(selected.dirty).toBe(false);
  expect(selected.afterApplyNodeId).toBe(source.id);
  for (const selection of [
    { nodeIds: [], edgeIds: [] },
    { nodeIds: [source.id, other.id], edgeIds: [] },
    { nodeIds: [source.id], edgeIds: [edgeId('connection')] },
  ]) {
    expect(projectNodeEditor(view, selection, undefined).selected).toBeUndefined();
  }

  const edited = { ...draft, label: 'Unsaved' };
  const switching = projectNodeEditor(view, { nodeIds: [other.id], edgeIds: [] }, edited);
  expect(switching.selected).toBe(view.query.getNode(other.id));
  expect(switching.current).toBe(current);
  expect(switching.dirty).toBe(true);
  expect(switching.switching).toBe(true);
  expect(switching.stale).toBe(false);
  expect(switching.afterApplyNodeId).toBe(other.id);
  expect(projectNodeEditor(view, { nodeIds: [], edgeIds: [] }, edited).afterApplyNodeId).toBeUndefined();
});

test('a dirty draft exposes replacement or deletion without treating unrelated edits as stale', () => {
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => transaction.nodes.add(source));
  const expectedNode = kernel.read().query.getNode(source.id)!;
  const draft = { ...createNodeDraft(expectedNode), label: 'Unsaved' };
  const selection = { nodeIds: [source.id], edgeIds: [] };
  kernel.transact((transaction) => transaction.nodes.add({ ...source, id: nodeId('other') }));
  expect(projectNodeEditor(kernel.read(), selection, draft).stale).toBe(false);

  kernel.transact((transaction) =>
    transaction.nodes.replace(source.id, { ...expectedNode, position: { x: 30, y: 40 } }),
  );
  const moved = projectNodeEditor(kernel.read(), selection, draft);
  expect(moved.current).toBe(kernel.read().query.getNode(source.id));
  expect(moved.stale).toBe(true);
  expect(moved.switching).toBe(false);
  expect(moved.afterApplyNodeId).toBe(source.id);
  kernel.transact((transaction) => transaction.nodes.remove(source.id));
  const deleted = projectNodeEditor(kernel.read(), { nodeIds: [], edgeIds: [] }, draft);
  expect(deleted.current).toBeUndefined();
  expect(deleted.stale).toBe(true);
  expect(deleted.switching).toBe(true);
});
