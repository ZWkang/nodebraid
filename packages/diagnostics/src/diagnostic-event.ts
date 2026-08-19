import { describeError, type DiagnosticErrorDescription } from './error-description';
import type { DiagnosticAttributes } from './diagnostic-value';

export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DiagnosticScope {
  readonly hostId: string;
  readonly installationId?: string;
  readonly activationId?: string;
  readonly pluginName?: string;
}

export interface DiagnosticEvent {
  readonly version: 1;
  readonly id: string;
  readonly sequence: number;
  readonly timestamp: number;
  readonly name: string;
  readonly level: DiagnosticLevel;
  readonly scope: DiagnosticScope;
  readonly attributes: DiagnosticAttributes;
  readonly error?: unknown;
}

export interface DiagnosticEventInput {
  readonly name: string;
  readonly level: DiagnosticLevel;
  readonly attributes?: DiagnosticAttributes;
  readonly error?: unknown;
}

export interface DiagnosticFault {
  readonly event: DiagnosticEvent;
  readonly error: unknown;
}

export type DiagnosticSink = (event: DiagnosticEvent) => void;
export type FaultReporter = (fault: DiagnosticFault) => void;

export interface PluginDiagnostics {
  emit(input: DiagnosticEventInput): void;
  reportFault(error: unknown, input: Omit<DiagnosticEventInput, 'level' | 'error'>): void;
}

export type DescribedDiagnosticEvent = Omit<DiagnosticEvent, 'error'> & {
  readonly error?: DiagnosticErrorDescription;
};

export function describeDiagnosticEvent(event: DiagnosticEvent): DescribedDiagnosticEvent {
  const { error, ...safeEvent } = event;
  return Object.freeze({
    ...safeEvent,
    ...(error === undefined ? {} : { error: describeError(error) }),
  });
}
