import { commandService } from '@cflow/plugin-command';
import { kernelService } from '@cflow/plugin-kernel';
import { rendererService } from '@cflow/plugin-renderer';
import { sessionService } from '@cflow/plugin-session';
import { definePlugin } from '@cflow/runtime-cordis';

import { computeClickSelection } from './selection-transition';

export const interactionPlugin = definePlugin({
  name: '@cflow/plugin-interaction',
  requires: {
    renderer: rendererService,
    session: sessionService,
    commands: commandService,
    kernel: kernelService,
  },
  setup(context) {
    const renderer = context.services.renderer;
    const session = context.services.session;
    const projection = renderer.bindInteractionProjection();
    context.own(() => projection.dispose());

    let pressedPointerId: number | undefined;
    let completeClick: (() => void) | undefined;
    const stopInput = renderer.subscribeInput((input) => {
      if (input.type === 'pointer.down') {
        if (pressedPointerId !== undefined || input.button !== 'primary') return;
        const hit = renderer.hitTest(input.screenPoint);
        if (hit === null) return;
        renderer.focus();
        renderer.capturePointer(input.pointerId);
        pressedPointerId = input.pointerId;
        try {
          const additive = input.modifiers.shift || input.modifiers.meta || input.modifiers.control;
          if (additive) {
            completeClick = () =>
              session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, true));
            return;
          }
          if (hit.type === 'node' || hit.type === 'port') {
            const selection = session.getSnapshot().selection;
            if (
              selection.nodeIds.includes(hit.nodeId) &&
              (selection.nodeIds.length > 1 || selection.edgeIds.length > 0)
            ) {
              completeClick = () =>
                session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, false));
              return;
            }
          }
          session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, false));
        } catch (error) {
          pressedPointerId = undefined;
          completeClick = undefined;
          try {
            renderer.releasePointer(input.pointerId);
          } catch (cleanupError) {
            throw new AggregateError([error, cleanupError], 'Interaction Input handling and cleanup both failed.');
          }
          throw error;
        }
        return;
      }
      if (input.type === 'pointer.up' && input.pointerId === pressedPointerId) {
        pressedPointerId = undefined;
        const complete = completeClick;
        completeClick = undefined;
        complete?.();
      } else if (input.type === 'pointer.cancel' && input.pointerId === pressedPointerId) {
        pressedPointerId = undefined;
        completeClick = undefined;
      }
    });
    context.own(stopInput);
  },
});
