import { expect, test } from 'bun:test';
import { nodeId } from '@nodebraid/kernel';

import {
  getNodePortSnapshot,
  getPortDefinition,
  hasPortDefinitions,
  isConnectionTargetDefined,
  type PortSnapshot,
} from '../src';

test('Port Snapshot lookup preserves node ownership and roles', () => {
  const owner = nodeId('owner');
  const snapshot: PortSnapshot = Object.freeze({
    documentRevision: 4,
    generation: 2,
    nodes: Object.freeze([
      Object.freeze({
        nodeId: owner,
        ports: Object.freeze([
          Object.freeze({ id: 'in', role: 'target' as const }),
          Object.freeze({ id: 'out', role: 'source' as const }),
        ]),
      }),
    ]),
  });

  expect(getNodePortSnapshot(snapshot, owner)?.ports).toHaveLength(2);
  expect(getPortDefinition(snapshot, owner, 'out')).toEqual({ id: 'out', role: 'source' });
  expect(hasPortDefinitions(snapshot, owner)).toBeTrue();
  expect(hasPortDefinitions(snapshot, nodeId('missing'))).toBeFalse();
  expect(isConnectionTargetDefined(snapshot, { nodeId: owner, portId: 'out', role: 'source' })).toBeTrue();
  expect(isConnectionTargetDefined(snapshot, { nodeId: owner, role: 'source' })).toBeFalse();
  expect(isConnectionTargetDefined(snapshot, { nodeId: nodeId('plain'), role: 'target' })).toBeTrue();
});
