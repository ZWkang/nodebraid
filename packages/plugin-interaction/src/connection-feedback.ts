import type {
  ConnectionAnchorIdentity,
  ConnectionFeedbackReason,
  ConnectionFeedbackSnapshot,
} from '@nodebraid/interaction-api';
import { defineService } from '@nodebraid/runtime-cordis';
import { InteractionError } from './interaction-error';

export interface ConnectionFeedbackService {
  getSnapshot(): ConnectionFeedbackSnapshot;
  subscribe(listener: () => void): () => void;
}
export const connectionFeedbackService = defineService<ConnectionFeedbackService>('interaction.connection-feedback');

export function createConnectionFeedback(signal: AbortSignal, report: (error: unknown) => void) {
  let snapshot: ConnectionFeedbackSnapshot = Object.freeze({ type: 'idle' });
  const listeners = new Set<() => void>();
  const pending: ConnectionFeedbackSnapshot[] = [];
  let publishing = false;
  function check() {
    if (signal.aborted)
      throw new InteractionError('CONNECTION_FEEDBACK_DISPOSED', 'Connection feedback Activation has ended.');
  }
  signal.addEventListener('abort', () => {
    listeners.clear();
    pending.length = 0;
  });
  const service: ConnectionFeedbackService = Object.freeze({
    getSnapshot() {
      check();
      return snapshot;
    },
    subscribe(listener: () => void) {
      check();
      if (typeof listener !== 'function') throw new TypeError('Connection feedback subscriber must be a function.');
      const notify = () => listener();
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
  });
  function publish(next: ConnectionFeedbackSnapshot) {
    if (signal.aborted || equal(pending.at(-1) ?? snapshot, next)) return;
    if (next.type === 'preview') Object.freeze(next.target);
    pending.push(Object.freeze(next));
    if (publishing) return;
    publishing = true;
    try {
      while (pending.length) {
        snapshot = pending.shift()!;
        for (const listener of [...listeners]) {
          if (!listeners.has(listener)) continue;
          try {
            listener();
          } catch (error) {
            report(error);
          }
        }
      }
    } finally {
      publishing = false;
    }
  }
  return { service, publish };
}
function sameAnchor(a: ConnectionAnchorIdentity, b: ConnectionAnchorIdentity) {
  return a.nodeId === b.nodeId && a.portId === b.portId && a.role === b.role;
}
function sameReason(a: ConnectionFeedbackReason, b: ConnectionFeedbackReason) {
  return a.origin === b.origin && a.code === b.code && a.message === b.message;
}
function equal(a: ConnectionFeedbackSnapshot, b: ConnectionFeedbackSnapshot): boolean {
  if (a.type === 'idle' || b.type === 'idle') return a.type === b.type;
  if (!sameAnchor(a.source, b.source)) return false;
  if (a.type === 'rejected' || b.type === 'rejected')
    return (
      a.type === 'rejected' && b.type === 'rejected' && sameAnchor(a.target, b.target) && sameReason(a.reason, b.reason)
    );
  const x = a.target,
    y = b.target;
  if (x.type !== y.type || x.type === 'none' || y.type === 'none') return x.type === y.type;
  return (
    sameAnchor(x.anchor, y.anchor) && (x.type !== 'invalid' || (y.type === 'invalid' && sameReason(x.reason, y.reason)))
  );
}
