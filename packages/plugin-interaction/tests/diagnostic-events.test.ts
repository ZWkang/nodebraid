import { expect, test } from 'bun:test';

import { interactionDiagnosticEvents } from '../src';

test('publishes the stable Interaction diagnostic event catalog', () => {
  expect(interactionDiagnosticEvents).toEqual({
    pointerRejected: 'nodebraid.plugin.interaction.pointer.rejected',
    inputRejected: 'nodebraid.plugin.interaction.input.rejected',
    gestureCancelled: 'nodebraid.plugin.interaction.gesture.cancelled',
    connectionMaterializerFault: 'nodebraid.plugin.interaction.connection-materializer.fault',
    commandFault: 'nodebraid.plugin.interaction.command.fault',
  });
});
