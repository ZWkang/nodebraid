import { expect, test } from 'bun:test';

import { interactionDiagnosticEvents } from '../src';

test('publishes the stable Interaction diagnostic event catalog', () => {
  expect(interactionDiagnosticEvents).toEqual({
    pointerRejected: 'cflow.plugin.interaction.pointer.rejected',
    inputRejected: 'cflow.plugin.interaction.input.rejected',
    gestureCancelled: 'cflow.plugin.interaction.gesture.cancelled',
    connectionMaterializerFault: 'cflow.plugin.interaction.connection-materializer.fault',
    commandFault: 'cflow.plugin.interaction.command.fault',
  });
});
