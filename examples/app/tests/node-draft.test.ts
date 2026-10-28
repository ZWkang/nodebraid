import { expect, test } from 'bun:test';
import type { CanvasNode } from '@nodebraid/core';

import { createNodeDraft, isNodeDraftDirty, materializeNodeDraft } from '../src/example-runtime/node-draft';

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
