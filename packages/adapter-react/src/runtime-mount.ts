import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  DisposableRuntime,
  RuntimeFactory,
  RuntimeMount,
  RuntimeMountFailure,
  RuntimeMountFailureReporter,
  RuntimeMountSnapshot,
} from './contracts';

const pendingSnapshot = Object.freeze({ status: 'pending' } as const);

interface MountAttempt<Target, Runtime extends DisposableRuntime> {
  active: boolean;
  disposeStarted: boolean;
  readonly factory: RuntimeFactory<Target, Runtime>;
  runtime: Runtime | undefined;
  readonly target: Target;
}

class RuntimeMountSequence<Target, Runtime extends DisposableRuntime> {
  readonly #publish: (snapshot: RuntimeMountSnapshot<Target, Runtime>) => void;
  readonly #report: (failure: RuntimeMountFailure) => void;
  #brokenFailure: RuntimeMountFailure | undefined;
  #tail: Promise<void> = Promise.resolve();

  constructor(
    publish: (snapshot: RuntimeMountSnapshot<Target, Runtime>) => void,
    report: (failure: RuntimeMountFailure) => void,
  ) {
    this.#publish = publish;
    this.#report = report;
  }

  mount(target: Target, factory: RuntimeFactory<Target, Runtime>): () => void {
    const attempt: MountAttempt<Target, Runtime> = {
      active: true,
      disposeStarted: false,
      factory,
      runtime: undefined,
      target,
    };
    this.#publish(pendingSnapshot);
    this.#enqueue(() => this.#start(attempt));

    return () => {
      attempt.active = false;
      this.#enqueue(() => this.#dispose(attempt));
    };
  }

  #enqueue(operation: () => Promise<void>): void {
    this.#tail = this.#tail.then(operation);
  }

  async #start(attempt: MountAttempt<Target, Runtime>): Promise<void> {
    if (!attempt.active) return;
    if (this.#brokenFailure) {
      this.#publishFailure(attempt, this.#brokenFailure);
      return;
    }

    let runtime: Runtime;
    try {
      runtime = await attempt.factory(attempt.target);
    } catch (error) {
      const failure = createFailure('create', error);
      this.#publishFailure(attempt, failure);
      this.#reportFailure(failure);
      return;
    }

    attempt.runtime = runtime;
    if (!attempt.active) {
      await this.#dispose(attempt);
      return;
    }
    this.#publish(Object.freeze({ status: 'ready', target: attempt.target, runtime }));
  }

  async #dispose(attempt: MountAttempt<Target, Runtime>): Promise<void> {
    if (attempt.disposeStarted || !attempt.runtime) return;
    attempt.disposeStarted = true;
    const runtime = attempt.runtime;
    attempt.runtime = undefined;
    try {
      await runtime.dispose();
    } catch (error) {
      const failure = createFailure('dispose', error);
      this.#brokenFailure ??= failure;
      this.#publishFailure(attempt, failure);
      this.#reportFailure(failure);
    }
  }

  #publishFailure(attempt: MountAttempt<Target, Runtime>, failure: RuntimeMountFailure): void {
    if (attempt.active) this.#publish(Object.freeze({ status: 'failed', failure }));
  }

  #reportFailure(failure: RuntimeMountFailure): void {
    try {
      this.#report(failure);
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}

export function useRuntimeMount<Target, Runtime extends DisposableRuntime>(
  factory: RuntimeFactory<Target, Runtime>,
  reportFailure: RuntimeMountFailureReporter,
): RuntimeMount<Target, Runtime> {
  const reportFailureRef = useRef(reportFailure);
  reportFailureRef.current = reportFailure;
  const [target, setTarget] = useState<Target | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeMountSnapshot<Target, Runtime>>(pendingSnapshot);
  const sequenceRef = useRef<RuntimeMountSequence<Target, Runtime> | null>(null);
  if (!sequenceRef.current) {
    sequenceRef.current = new RuntimeMountSequence(setSnapshot, (failure) => reportFailureRef.current(failure));
  }

  const ref = useCallback((nextTarget: Target | null) => setTarget(nextTarget), []);

  useEffect(() => {
    if (target === null) {
      setSnapshot(pendingSnapshot);
      return;
    }
    return sequenceRef.current?.mount(target, factory);
  }, [factory, target]);

  return useMemo(() => Object.freeze({ ref, snapshot }), [ref, snapshot]);
}

function createFailure(phase: RuntimeMountFailure['phase'], error: unknown): RuntimeMountFailure {
  return Object.freeze({ phase, error });
}
