import { expect, test } from 'bun:test';
import { renderToString } from 'react-dom/server';

import type { HistoryService } from '@nodebraid/plugin-history';

import { useHistorySnapshot } from '../src';

const history: HistoryService = {
  getSnapshot: () => Object.freeze({ canUndo: false, canRedo: false }),
  subscribe: () => () => {},
};

function SnapshotConsumer() {
  const snapshot = useHistorySnapshot(history);
  return <span>{String(snapshot.canUndo)}</span>;
}

test('fails explicitly when a Snapshot Hook is server-rendered without a hydration contract', () => {
  expect(() => renderToString(<SnapshotConsumer />)).toThrow();
});
