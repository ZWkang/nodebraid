import type { PluginDiagnostics } from '@nodebraid/diagnostics';
import type { CanvasNode, CanvasSnapshot } from '@nodebraid/kernel';
import type { NodePortSnapshot, PortDefinition, PortSnapshot } from '@nodebraid/port-api';

import type { PortContribution, PortRegistration, PortService } from './contracts';
import { portDiagnosticEvents } from './diagnostic-events';
import { PortError } from './port-error';

interface ContributionEntry {
  readonly contribution: PortContribution;
  disposed: boolean;
}

export function createPortRuntime(diagnostics: PluginDiagnostics): {
  readonly service: PortService;
  readonly dispose: () => void;
} {
  const entries = new Map<string, ContributionEntry>();
  const listeners = new Set<() => void>();
  let generation = 0;
  let disposed = false;

  const assertActive = (): void => {
    if (disposed) throw new PortError('SERVICE_DISPOSED', 'Port Service has been disposed.');
  };

  const notify = (): void => {
    for (const listener of Array.from(listeners)) {
      try {
        listener();
      } catch (error) {
        diagnostics.reportFault(error, { name: portDiagnosticEvents.subscriberFault });
      }
    }
  };

  const service: PortService = Object.freeze({
    register(value: PortContribution): PortRegistration {
      assertActive();
      const contribution = acceptContribution(value);
      if (entries.has(contribution.id)) {
        throw new PortError('CONTRIBUTION_ALREADY_REGISTERED', 'Port Contribution ID is already registered.', {
          contributionId: contribution.id,
        });
      }
      const entry: ContributionEntry = { contribution, disposed: false };
      entries.set(contribution.id, entry);
      generation += 1;
      notify();
      return Object.freeze({
        dispose(): void {
          if (entry.disposed) return;
          entry.disposed = true;
          if (entries.get(contribution.id) !== entry) return;
          entries.delete(contribution.id);
          generation += 1;
          if (!disposed) notify();
        },
      });
    },
    snapshot(document: CanvasSnapshot): PortSnapshot {
      assertActive();
      if (!isCanvasSnapshot(document)) {
        throw new PortError('INVALID_CONTRIBUTION', 'Port Snapshot requires a committed Canvas Snapshot.');
      }
      const contributions = Array.from(entries.values(), (entry) => entry.contribution).sort((left, right) =>
        compareIds(left.id, right.id),
      );
      const nodes: NodePortSnapshot[] = [];
      for (const node of document.nodes) {
        const ports = resolveNodePorts(node, contributions);
        if (ports.length > 0) nodes.push(Object.freeze({ nodeId: node.id, ports }));
      }
      return Object.freeze({
        documentRevision: document.revision,
        generation,
        nodes: Object.freeze(nodes),
      });
    },
    subscribe(listener: () => void): () => void {
      assertActive();
      if (typeof listener !== 'function') {
        throw new PortError('INVALID_CONTRIBUTION', 'Port subscriber must be a function.');
      }
      listeners.add(listener);
      let active = true;
      return (): void => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
  });

  return {
    service,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      entries.clear();
      generation += 1;
    },
  };
}

function acceptContribution(value: PortContribution): PortContribution {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.definePorts !== 'function'
  ) {
    throw new PortError('INVALID_CONTRIBUTION', 'Port Contribution is malformed.');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'id' || key === 'definePorts') continue;
    throw new PortError('INVALID_CONTRIBUTION', 'Port Contribution contains an unknown field.');
  }
  return Object.freeze({ id: value.id, definePorts: value.definePorts });
}

function resolveNodePorts(node: CanvasNode, contributions: readonly PortContribution[]): readonly PortDefinition[] {
  const definitions = new Map<string, PortDefinition>();
  for (const contribution of contributions) {
    const received = contribution.definePorts(node);
    if (!Array.isArray(received)) {
      throw new PortError('INVALID_PORT_DEFINITION', 'Port Contribution must return an array.', {
        contributionId: contribution.id,
      });
    }
    for (const value of received) {
      const definition = acceptPortDefinition(value, contribution.id);
      if (definitions.has(definition.id)) {
        throw new PortError('PORT_ALREADY_DEFINED', 'Port ID is already defined for this Node.', {
          contributionId: contribution.id,
          portId: definition.id,
        });
      }
      definitions.set(definition.id, definition);
    }
  }
  return Object.freeze(Array.from(definitions.values()).sort((left, right) => compareIds(left.id, right.id)));
}

function acceptPortDefinition(value: unknown, contributionId: string): PortDefinition {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof Reflect.get(value, 'id') !== 'string' ||
    (Reflect.get(value, 'id') as string).length === 0 ||
    (Reflect.get(value, 'role') !== 'source' && Reflect.get(value, 'role') !== 'target')
  ) {
    throw new PortError('INVALID_PORT_DEFINITION', 'Port Definition is malformed.', { contributionId });
  }
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'id' || key === 'role') continue;
    throw new PortError('INVALID_PORT_DEFINITION', 'Port Definition contains an unknown field.', {
      contributionId,
    });
  }
  return Object.freeze({
    id: Reflect.get(value, 'id') as string,
    role: Reflect.get(value, 'role') as PortDefinition['role'],
  });
}

function isCanvasSnapshot(value: CanvasSnapshot): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isInteger(value.revision) &&
    value.revision >= 0 &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
