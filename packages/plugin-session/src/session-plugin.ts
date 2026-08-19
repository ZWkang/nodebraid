import { describeNonFiniteNumber, type DiagnosticAttributes } from '@cflow/diagnostics';
import { kernelService } from '@cflow/plugin-kernel';
import { definePlugin, defineService } from '@cflow/runtime-cordis';

import type { SelectionInput, SelectionSnapshot, SessionService, SessionSnapshot, Viewport } from './contracts';
import { sessionDiagnosticEvents } from './diagnostic-events';
import { SessionError } from './session-error';

export const sessionService = defineService<SessionService>('session');

export const sessionPlugin = definePlugin({
  name: '@cflow/plugin-session',
  requires: { kernel: kernelService },
  provides: { session: sessionService },
  setup(context) {
    void context.services.kernel;
    const emptySelection = createSelectionSnapshot({ nodeIds: [], edgeIds: [] });
    const defaultViewport: Viewport = Object.freeze({ x: 0, y: 0, zoom: 1 });
    let snapshot: SessionSnapshot = createSessionSnapshot(emptySelection, defaultViewport);
    const subscriptions: SubscriptionRegistration[] = [];
    const transitions: SessionTransition[] = [];
    let transitioning = false;
    let disposed = false;
    const assertActive = (): void => {
      if (disposed) {
        throw new SessionError('SERVICE_DISPOSED', 'Session Service Activation has been disposed.');
      }
    };
    const enqueueTransition = (transition: SessionTransition): void => {
      transitions.push(transition);
      if (transitioning) return;
      transitioning = true;
      try {
        for (const queuedTransition of transitions) {
          const nextSnapshot = queuedTransition(snapshot);
          if (!nextSnapshot) continue;
          snapshot = nextSnapshot;
          const currentListeners = subscriptions
            .filter((registration) => registration.active)
            .map(({ listener }) => listener);
          for (const listener of currentListeners) {
            try {
              listener();
            } catch (error) {
              context.diagnostics.reportFault(error, {
                name: sessionDiagnosticEvents.subscriberFault,
              });
            }
          }
        }
      } finally {
        transitions.length = 0;
        transitioning = false;
      }
    };
    const publishSelection = (selection: SelectionSnapshot): void => {
      enqueueTransition((current) =>
        selectionsEqual(current.selection, selection) ? null : createSessionSnapshot(selection, current.viewport),
      );
    };
    const publishViewport = (viewport: Viewport): void => {
      enqueueTransition((current) =>
        viewportsEqual(current.viewport, viewport) ? null : createSessionSnapshot(current.selection, viewport),
      );
    };
    const service: SessionService = Object.freeze({
      getSnapshot(): SessionSnapshot {
        assertActive();
        return snapshot;
      },
      subscribe(listener: () => void): () => void {
        assertActive();
        if (typeof listener !== 'function') {
          throw new SessionError(
            'INVALID_SUBSCRIBER',
            'Session subscriber must be a function.',
            Object.freeze({ receivedType: describeReceivedType(listener) }),
          );
        }
        const registration: SubscriptionRegistration = { listener, active: true };
        subscriptions.push(registration);
        return () => {
          if (!registration.active) return;
          registration.active = false;
          const index = subscriptions.indexOf(registration);
          if (index >= 0) subscriptions.splice(index, 1);
        };
      },
      setSelection(selection: SelectionInput): void {
        assertActive();
        validateSelectionInput(selection);
        const nextSelection = createSelectionSnapshot(selection);
        const view = context.services.kernel.read();
        const missingNodeIds = Object.freeze(nextSelection.nodeIds.filter((id) => !view.query.getNode(id)));
        const missingEdgeIds = Object.freeze(nextSelection.edgeIds.filter((id) => !view.query.getEdge(id)));
        if (missingNodeIds.length > 0 || missingEdgeIds.length > 0) {
          throw new SessionError(
            'SELECTION_ENTITY_NOT_FOUND',
            'Selection contains entities that do not exist in the current Canvas View.',
            Object.freeze({ missingNodeIds, missingEdgeIds }),
          );
        }
        publishSelection(nextSelection);
      },
      clearSelection(): void {
        assertActive();
        publishSelection(emptySelection);
      },
      setViewport(viewport: Viewport): void {
        assertActive();
        const issues = collectViewportIssues(viewport);
        if (issues.length > 0) {
          throw new SessionError(
            'INVALID_VIEWPORT',
            'Viewport requires finite x and y values and a finite zoom greater than zero.',
            Object.freeze({ issues }),
          );
        }
        publishViewport(
          Object.freeze({
            x: normalizeZero(viewport.x),
            y: normalizeZero(viewport.y),
            zoom: viewport.zoom,
          }),
        );
      },
    });
    const stopObservingCommits = context.services.kernel.observeCommits((commit) => {
      enqueueTransition((current) => {
        const selection = current.selection;
        const nodeIds = selection.nodeIds.filter((id) => commit.after.query.getNode(id));
        const edgeIds = selection.edgeIds.filter((id) => commit.after.query.getEdge(id));
        if (nodeIds.length === selection.nodeIds.length && edgeIds.length === selection.edgeIds.length) return null;
        return createSessionSnapshot(createSelectionSnapshot({ nodeIds, edgeIds }), current.viewport);
      });
    });
    context.own(stopObservingCommits);
    context.own(() => {
      disposed = true;
      for (const registration of subscriptions) registration.active = false;
      subscriptions.length = 0;
      transitions.length = 0;
    });
    return { session: service };
  },
});

type SessionTransition = (current: SessionSnapshot) => SessionSnapshot | null;

interface SubscriptionRegistration {
  readonly listener: () => void;
  active: boolean;
}

function createSelectionSnapshot(selection: SelectionInput): SelectionSnapshot {
  const nodeIds = Object.freeze([...new Set(selection.nodeIds)].sort(compareIds));
  const edgeIds = Object.freeze([...new Set(selection.edgeIds)].sort(compareIds));
  return Object.freeze({ nodeIds, edgeIds });
}

function createSessionSnapshot(selection: SelectionSnapshot, viewport: Viewport): SessionSnapshot {
  return Object.freeze({ selection, viewport });
}

function selectionsEqual(left: SelectionSnapshot, right: SelectionSnapshot): boolean {
  return arraysEqual(left.nodeIds, right.nodeIds) && arraysEqual(left.edgeIds, right.edgeIds);
}

function viewportsEqual(left: Viewport, right: Viewport): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

type ViewportIssue = DiagnosticAttributes;

function collectViewportIssues(viewport: unknown): readonly ViewportIssue[] {
  if (typeof viewport !== 'object' || viewport === null) {
    const issue: ViewportIssue = Object.freeze({
      field: 'viewport',
      code: 'EXPECTED_OBJECT',
      receivedType: describeReceivedType(viewport),
    });
    return Object.freeze([issue]);
  }
  const issues: ViewportIssue[] = [];
  const x = Reflect.get(viewport, 'x');
  const y = Reflect.get(viewport, 'y');
  const zoom = Reflect.get(viewport, 'zoom');
  if (typeof x !== 'number' || !Number.isFinite(x)) issues.push(describeInvalidViewportNumber('x', x));
  if (typeof y !== 'number' || !Number.isFinite(y)) issues.push(describeInvalidViewportNumber('y', y));
  if (typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom <= 0) {
    issues.push(describeInvalidViewportNumber('zoom', zoom));
  }
  return Object.freeze(issues);
}

function describeInvalidViewportNumber(field: keyof Viewport, value: unknown): ViewportIssue {
  const code = field === 'zoom' ? 'EXPECTED_POSITIVE_NUMBER' : 'EXPECTED_FINITE_NUMBER';
  if (typeof value !== 'number') {
    return Object.freeze({ field, code, receivedType: describeReceivedType(value) });
  }
  if (!Number.isFinite(value)) {
    return Object.freeze({ field, code, receivedNumber: describeNonFiniteNumber(value) });
  }
  return Object.freeze({ field, code, value });
}

function describeReceivedType(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

type SelectionInputIssue = DiagnosticAttributes;

function validateSelectionInput(selection: unknown): asserts selection is SelectionInput {
  const issues: SelectionInputIssue[] = [];
  if (typeof selection !== 'object' || selection === null) {
    issues.push(
      Object.freeze({
        field: 'selection',
        code: 'EXPECTED_OBJECT',
        receivedType: describeReceivedType(selection),
      }),
    );
  } else {
    collectSelectionFieldIssues('nodeIds', Reflect.get(selection, 'nodeIds'), issues);
    collectSelectionFieldIssues('edgeIds', Reflect.get(selection, 'edgeIds'), issues);
  }
  if (issues.length > 0) {
    throw new SessionError(
      'INVALID_SELECTION',
      'Selection requires NodeId and EdgeId arrays containing non-empty string identifiers.',
      Object.freeze({ issues: Object.freeze(issues) }),
    );
  }
}

function collectSelectionFieldIssues(
  field: 'nodeIds' | 'edgeIds',
  value: unknown,
  issues: SelectionInputIssue[],
): void {
  if (!Array.isArray(value)) {
    issues.push(Object.freeze({ field, code: 'EXPECTED_ARRAY', receivedType: describeReceivedType(value) }));
    return;
  }
  for (let index = 0; index < value.length; index += 1) {
    const id = value[index];
    if (typeof id !== 'string' || id.length === 0) {
      issues.push(
        Object.freeze({
          field,
          code: 'INVALID_ID',
          index,
          ...(typeof id === 'string' ? { value: id } : { receivedType: describeReceivedType(id) }),
        }),
      );
    }
  }
}
