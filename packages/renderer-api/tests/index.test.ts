import { expect, test } from 'bun:test';

import { CFlowError } from '@cflow/diagnostics';

import { RendererError, type RendererInput } from '../src';

test('publishes backend-neutral Renderer Input values', () => {
  const input: RendererInput = {
    type: 'pointer.down',
    pointerId: 1,
    pointerType: 'mouse',
    screenPoint: { x: 10, y: 20 },
    worldPoint: { x: 5, y: 10 },
    button: 'primary',
    pressedButtons: ['primary'],
    modifiers: { alt: false, control: false, meta: false, shift: true },
  };

  expect(input.type).toBe('pointer.down');
});

test('identifies Renderer contract failures structurally', () => {
  const error = new RendererError('DOCUMENT_OUT_OF_SYNC', 'Renderer Commit is not contiguous.', {
    expectedRevision: 2,
    receivedRevision: 4,
  });

  expect(error).toBeInstanceOf(CFlowError);
  expect(error).toMatchObject({
    domain: 'renderer',
    code: 'DOCUMENT_OUT_OF_SYNC',
    details: { expectedRevision: 2, receivedRevision: 4 },
  });
  expect(Object.isFrozen(error.details)).toBeTrue();
});
