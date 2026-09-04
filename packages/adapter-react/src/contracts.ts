import type { RefCallback } from 'react';

export interface DisposableRuntime {
  dispose(): Promise<void>;
}

export type RuntimeFactory<Target, Runtime extends DisposableRuntime> = (target: Target) => Promise<Runtime>;

export type RuntimeMountFailurePhase = 'create' | 'dispose';

export interface RuntimeMountFailure {
  readonly phase: RuntimeMountFailurePhase;
  readonly error: unknown;
}

export type RuntimeMountFailureReporter = (failure: RuntimeMountFailure) => void;

export type RuntimeMountSnapshot<Target, Runtime extends DisposableRuntime> =
  | Readonly<{ status: 'pending' }>
  | Readonly<{ status: 'ready'; target: Target; runtime: Runtime }>
  | Readonly<{ status: 'failed'; failure: RuntimeMountFailure }>;

export interface RuntimeMount<Target, Runtime extends DisposableRuntime> {
  /** Attach to exactly one React Target at a time. A second live Target fails explicitly. */
  readonly ref: RefCallback<Target>;
  readonly snapshot: RuntimeMountSnapshot<Target, Runtime>;
}
