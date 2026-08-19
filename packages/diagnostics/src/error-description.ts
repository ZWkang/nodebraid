import { CFlowError } from './cflow-error';
import type { DiagnosticAttributes, DiagnosticValue } from './diagnostic-value';

interface DiagnosticErrorBase {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly cause?: DiagnosticErrorDescription;
}

export interface CFlowErrorDescription extends DiagnosticErrorBase {
  readonly kind: 'cflow';
  readonly domain: string;
  readonly code: string;
  readonly details: DiagnosticAttributes;
}

export interface NativeErrorDescription extends DiagnosticErrorBase {
  readonly kind: 'error';
}

export interface AggregateErrorDescription extends DiagnosticErrorBase {
  readonly kind: 'aggregate';
  readonly errors: readonly DiagnosticErrorDescription[];
}

export interface UnknownErrorDescription {
  readonly kind: 'unknown';
  readonly type: string;
  readonly value?: DiagnosticValue;
}

export interface CircularErrorDescription {
  readonly kind: 'circular';
  readonly reference: string;
}

export type DiagnosticErrorDescription =
  | CFlowErrorDescription
  | AggregateErrorDescription
  | NativeErrorDescription
  | UnknownErrorDescription
  | CircularErrorDescription;

export function describeError(error: unknown): DiagnosticErrorDescription {
  return describeErrorAtPath(error, '$', new Map());
}

function describeErrorAtPath(error: unknown, path: string, ancestors: Map<object, string>): DiagnosticErrorDescription {
  if (error === null) return Object.freeze({ kind: 'unknown', type: 'null', value: null });
  if (typeof error !== 'object') {
    if (
      typeof error === 'string' ||
      typeof error === 'boolean' ||
      (typeof error === 'number' && Number.isFinite(error))
    ) {
      return Object.freeze({ kind: 'unknown', type: typeof error, value: error });
    }
    return Object.freeze({ kind: 'unknown', type: typeof error });
  }
  const firstPath = ancestors.get(error);
  if (firstPath) return Object.freeze({ kind: 'circular', reference: firstPath });
  ancestors.set(error, path);
  try {
    if (error instanceof AggregateError) {
      return Object.freeze({
        kind: 'aggregate',
        name: error.name,
        message: error.message,
        ...(typeof error.stack === 'string' ? { stack: error.stack } : {}),
        errors: Object.freeze(
          error.errors.map((nestedError, index) =>
            describeErrorAtPath(nestedError, `${path}.errors[${index}]`, ancestors),
          ),
        ),
        ...(error.cause === undefined ? {} : { cause: describeErrorAtPath(error.cause, `${path}.cause`, ancestors) }),
      });
    }
    if (error instanceof CFlowError) {
      return Object.freeze({
        kind: 'cflow',
        name: error.name,
        message: error.message,
        ...(typeof error.stack === 'string' ? { stack: error.stack } : {}),
        domain: error.domain,
        code: error.code,
        details: error.details,
        ...(error.cause === undefined ? {} : { cause: describeErrorAtPath(error.cause, `${path}.cause`, ancestors) }),
      });
    }
    if (error instanceof Error) {
      return Object.freeze({
        kind: 'error',
        name: error.name,
        message: error.message,
        ...(typeof error.stack === 'string' ? { stack: error.stack } : {}),
        ...(error.cause === undefined ? {} : { cause: describeErrorAtPath(error.cause, `${path}.cause`, ancestors) }),
      });
    }
    return Object.freeze({ kind: 'unknown', type: typeof error });
  } finally {
    ancestors.delete(error);
  }
}
