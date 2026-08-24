import {
  DiagnosticsError,
  DiagnosticValueError,
  diagnosticEvents,
  normalizeDiagnosticAttributes,
  type DiagnosticEvent,
  type DiagnosticEventInput,
  type DiagnosticFault,
  type DiagnosticScope,
  type DiagnosticSink,
  type FaultReporter,
  type PluginDiagnostics,
} from '@nodebraid/diagnostics';

import type { PluginHostDiagnosticsOptions } from './plugin-contracts';

let nextHostId = 0;

export interface InstallationDiagnostics {
  readonly diagnostics: PluginDiagnostics;
  createActivation(): PluginDiagnostics;
  findUndiagnosedError(error: unknown): UndiagnosedError;
}

export type UndiagnosedError =
  Readonly<{ readonly found: false }> | Readonly<{ readonly found: true; readonly error: unknown }>;

export class HostDiagnostics {
  readonly #hostId: string;
  readonly #hostScope: DiagnosticScope;
  readonly #sink: DiagnosticSink | undefined;
  readonly #faultReporter: FaultReporter;
  #nextInstallationId = 0;
  #nextActivationId = 0;
  #sequence = 0;
  readonly #diagnosedErrors = new WeakSet<object>();

  constructor(options: PluginHostDiagnosticsOptions = {}) {
    if (options.hostId !== undefined && (typeof options.hostId !== 'string' || options.hostId.length === 0)) {
      throw new DiagnosticsError(
        'INVALID_DIAGNOSTIC_VALUE',
        'Diagnostic Host ID must be a non-empty string.',
        typeof options.hostId === 'string'
          ? { field: 'hostId', value: options.hostId }
          : { field: 'hostId', receivedType: options.hostId === null ? 'null' : typeof options.hostId },
      );
    }
    this.#hostId = options.hostId ?? `nodebraid.host.${++nextHostId}`;
    this.#hostScope = Object.freeze({ hostId: this.#hostId });
    this.#sink = options.sink;
    this.#faultReporter = options.faultReporter ?? reportFaultToPlatform;
  }

  emit(input: DiagnosticEventInput): void {
    this.#emit(this.#hostScope, input, false);
  }

  createInstallation(pluginName: string | undefined): InstallationDiagnostics {
    const installationId = `${this.#hostId}.installation.${++this.#nextInstallationId}`;
    const installationScope = Object.freeze({
      hostId: this.#hostId,
      installationId,
      ...(pluginName === undefined ? {} : { pluginName }),
    });
    return Object.freeze({
      diagnostics: this.#createPluginDiagnostics(installationScope),
      findUndiagnosedError: (error: unknown) => this.#findUndiagnosedError(error, new Set()),
      createActivation: () =>
        this.#createPluginDiagnostics(
          Object.freeze({
            ...installationScope,
            activationId: `${this.#hostId}.activation.${++this.#nextActivationId}`,
          }),
        ),
    });
  }

  #createPluginDiagnostics(scope: DiagnosticScope): PluginDiagnostics {
    return Object.freeze({
      emit: (input: DiagnosticEventInput) => {
        this.#emit(scope, input, false);
      },
      reportFault: (error: unknown, input: Omit<DiagnosticEventInput, 'level' | 'error'>) => {
        try {
          const event = this.#emit(scope, { ...input, level: 'error', error }, true)!;
          this.#reportFault(Object.freeze({ event, error }));
        } catch (contractError) {
          const reportedError = new AggregateError([error, contractError], 'Fault reporting input was invalid.');
          const event = this.#createEvent(scope, {
            name: diagnosticEvents.faultReportingFault,
            level: 'error',
            attributes: {
              ...(typeof input.name === 'string'
                ? { attemptedEventName: input.name }
                : {
                    attemptedEventType: input.name === null ? 'null' : typeof input.name,
                  }),
              contractCode: contractError instanceof DiagnosticsError ? contractError.code : 'UNKNOWN_CONTRACT_FAILURE',
            },
            error: reportedError,
          });
          this.#reportFault(Object.freeze({ event, error: reportedError }));
        }
      },
    });
  }

  #emit(scope: DiagnosticScope, input: DiagnosticEventInput, required: boolean): DiagnosticEvent | undefined {
    if (typeof input.name !== 'string' || input.name.length === 0) {
      throw new DiagnosticsError(
        'INVALID_EVENT',
        'Diagnostic Event name must be a non-empty string.',
        typeof input.name === 'string'
          ? { field: 'name', value: input.name }
          : { field: 'name', receivedType: input.name === null ? 'null' : typeof input.name },
      );
    }
    if (!(['debug', 'info', 'warn', 'error'] as const).includes(input.level)) {
      throw new DiagnosticsError(
        'INVALID_EVENT',
        'Diagnostic Event level must be debug, info, warn, or error.',
        typeof input.level === 'string'
          ? { field: 'level', value: input.level }
          : { field: 'level', receivedType: input.level === null ? 'null' : typeof input.level },
      );
    }
    let attributes;
    try {
      attributes = normalizeDiagnosticAttributes(input.attributes ?? {});
    } catch (error) {
      if (error instanceof DiagnosticValueError) {
        throw new DiagnosticsError(
          'INVALID_DIAGNOSTIC_VALUE',
          'Diagnostic Event attributes must be JSON-safe.',
          error.details,
          { cause: error },
        );
      }
      throw error;
    }
    if (!this.#sink && !required) return undefined;
    const event = this.#createEvent(scope, { ...input, attributes });
    if (this.#sink) {
      try {
        const result = this.#sink(event) as unknown;
        if (isPromiseLike(result)) {
          this.#reportSinkFault(
            scope,
            input.name,
            new DiagnosticsError('ASYNC_SINK', 'Diagnostic Sink must return synchronously.', { eventName: input.name }),
          );
          void Promise.resolve(result).catch((sinkError: unknown) => {
            this.#reportSinkFault(scope, input.name, sinkError);
          });
        }
      } catch (sinkError) {
        this.#reportSinkFault(scope, input.name, sinkError);
      }
    }
    return event;
  }

  #createEvent(scope: DiagnosticScope, input: DiagnosticEventInput): DiagnosticEvent {
    const sequence = ++this.#sequence;
    if (input.level === 'error' && Object.hasOwn(input, 'error') && isReference(input.error)) {
      this.#diagnosedErrors.add(input.error);
    }
    return Object.freeze({
      version: 1,
      id: `${this.#hostId}.event.${sequence}`,
      sequence,
      timestamp: Date.now(),
      name: input.name,
      level: input.level,
      scope,
      attributes: normalizeDiagnosticAttributes(input.attributes ?? {}),
      ...(input.error === undefined ? {} : { error: input.error }),
    } satisfies DiagnosticEvent);
  }

  #reportFault(fault: DiagnosticFault): void {
    try {
      const result = this.#faultReporter(fault) as unknown;
      if (isPromiseLike(result)) {
        const contractError = new DiagnosticsError(
          'ASYNC_FAULT_REPORTER',
          'Fault Reporter must return synchronously.',
          { eventName: fault.event.name },
          { cause: fault.error },
        );
        void Promise.resolve(result).then(
          () => this.#scheduleFinalError(contractError),
          (reporterError: unknown) =>
            this.#scheduleFinalError(
              new AggregateError([fault.error, contractError, reporterError], 'Asynchronous Fault Reporter failed.'),
            ),
        );
      }
    } catch (reporterError) {
      this.#scheduleFinalError(new AggregateError([fault.error, reporterError], 'Fault reporting failed.'));
    }
  }

  #scheduleFinalError(error: unknown): void {
    queueMicrotask(() => {
      throw error;
    });
  }

  #reportSinkFault(scope: DiagnosticScope, eventName: string, error: unknown): void {
    const faultEvent = this.#createEvent(scope, {
      name: diagnosticEvents.sinkFault,
      level: 'error',
      attributes: normalizeDiagnosticAttributes({ eventName }),
      error,
    });
    this.#reportFault(Object.freeze({ event: faultEvent, error }));
  }

  #findUndiagnosedError(error: unknown, ancestors: Set<unknown>): UndiagnosedError {
    if (isReference(error) && this.#diagnosedErrors.has(error)) {
      return Object.freeze({ found: false });
    }
    if (!(error instanceof AggregateError) || ancestors.has(error)) {
      return Object.freeze({ found: true, error });
    }
    ancestors.add(error);
    try {
      const nestedErrors = error.errors
        .map((nestedError) => this.#findUndiagnosedError(nestedError, ancestors))
        .filter((result): result is Readonly<{ readonly found: true; readonly error: unknown }> => result.found)
        .map((result) => result.error);
      if (nestedErrors.length === 0) return Object.freeze({ found: false });
      if (
        nestedErrors.length === error.errors.length &&
        nestedErrors.every((nestedError, index) => nestedError === error.errors[index])
      ) {
        return Object.freeze({ found: true, error });
      }
      return Object.freeze({
        found: true,
        error: new AggregateError(nestedErrors, error.message),
      });
    } finally {
      ancestors.delete(error);
    }
  }
}

function reportFaultToPlatform(fault: DiagnosticFault): void {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(fault.error);
    return;
  }
  queueMicrotask(() => {
    throw fault.error;
  });
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return isReference(value) && typeof Reflect.get(value, 'then') === 'function';
}

function isReference(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}
