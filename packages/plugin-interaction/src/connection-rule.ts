import type { CanvasView, EdgeEndpoint } from '@nodebraid/kernel';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { PortService } from '@nodebraid/plugin-port';
import type { PortSnapshot } from '@nodebraid/port-api';
import type { ConnectionDecision, ConnectionRule } from './contracts';
import { isRecord } from './canvas-value-validation';
import { InteractionError } from './interaction-error';

export class StaleConnection extends InteractionError {
  constructor(message: string) {
    super('STALE_GESTURE', message);
  }
}

export class RejectedConnection extends InteractionError {
  constructor(readonly reason: { readonly code: string; readonly message: string }) {
    super('CONNECTION_REJECTED', reason.message, { reasonCode: reason.code, reasonMessage: reason.message });
  }
}

export interface ConnectionEvidence {
  readonly view: CanvasView;
  readonly ports: PortSnapshot;
  decide(source: EdgeEndpoint, target: EdgeEndpoint): ConnectionDecision;
  check(): void;
}

export class ConnectionRules {
  private portVersion = 0;
  evaluating: 'command' | 'preview' | undefined;

  constructor(
    private readonly kernel: KernelService,
    private readonly ports: PortService,
    private readonly rule: ConnectionRule,
    private readonly activation: AbortSignal,
  ) {}

  portsChanged(): void {
    this.portVersion++;
  }

  write(add: () => void): void {
    this.evaluating = 'command';
    try {
      add();
    } finally {
      this.evaluating = undefined;
    }
  }

  evaluate<T>(
    read: (evidence: ConnectionEvidence) => T,
    command?: {
      signal: AbortSignal;
      stale: (message: string) => StaleConnection;
      preflight: (view: CanvasView, check: () => void) => void;
    },
  ): T {
    const stale = command?.stale ?? ((message: string) => new StaleConnection(message));
    if (this.evaluating) throw stale('Connection evaluation reentered.');
    const view = this.kernel.read(),
      version = this.portVersion;
    const check = () => {
      command?.signal.throwIfAborted();
      this.activation.throwIfAborted();
      if (this.kernel.read() !== view || this.portVersion !== version)
        throw stale('Connection decision inputs changed.');
    };
    this.evaluating = command ? 'command' : 'preview';
    try {
      check();
      command?.preflight(view, check);
      check();
      const ports = this.ports.snapshot(view.snapshot);
      check();
      const decide = (source: EdgeEndpoint, target: EdgeEndpoint) => {
        const { rule } = this;
        const decision = captureDecision(
          rule(Object.freeze({ source: endpoint(source), target: endpoint(target), view, ports })),
        );
        check();
        return decision;
      };
      return read({ view, ports, decide, check });
    } finally {
      this.evaluating = undefined;
    }
  }
}
function endpoint({ nodeId, portId }: EdgeEndpoint): EdgeEndpoint {
  return Object.freeze(portId === undefined ? { nodeId } : { nodeId, portId });
}
function captureDecision(value: unknown): ConnectionDecision {
  if (isRecord(value) && typeof value.then !== 'function') {
    const type = value.type;
    if (type === 'allow') return { type };
    if (type === 'deny') {
      const reason = value.reason;
      if (isRecord(reason)) {
        const { code, message } = reason;
        if (typeof code === 'string' && code.length && typeof message === 'string' && message.length)
          return { type, reason: Object.freeze({ code, message }) };
      }
    }
  }
  throw new InteractionError(
    'INVALID_CONNECTION_DECISION',
    'Expected a synchronous allow or deny decision with a non-empty reason.',
  );
}
