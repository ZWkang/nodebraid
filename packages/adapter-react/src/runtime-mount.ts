import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

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
  readonly identity: MountIdentity<Target, Runtime>;
  runtime: Runtime | undefined;
}

interface MountIdentity<Target, Runtime extends DisposableRuntime> {
  readonly factory: RuntimeFactory<Target, Runtime>;
  readonly target: Target;
}

interface MountPublication<Target, Runtime extends DisposableRuntime> {
  readonly identity: MountIdentity<Target, Runtime> | undefined;
  readonly snapshot: RuntimeMountSnapshot<Target, Runtime>;
}

class RuntimeMountSequence<Target, Runtime extends DisposableRuntime> {
  readonly #publish: (publication: MountPublication<Target, Runtime>) => void;
  readonly #report: (failure: RuntimeMountFailure) => void;
  #brokenFailure: RuntimeMountFailure | undefined;
  #tail: Promise<void> = Promise.resolve();

  constructor(
    publish: (publication: MountPublication<Target, Runtime>) => void,
    report: (failure: RuntimeMountFailure) => void,
  ) {
    this.#publish = publish;
    this.#report = report;
  }

  mount(target: Target, factory: RuntimeFactory<Target, Runtime>): () => void {
    const identity = Object.freeze({ factory, target });
    const attempt: MountAttempt<Target, Runtime> = {
      active: true,
      disposeStarted: false,
      identity,
      runtime: undefined,
    };
    this.#publishSnapshot(attempt, pendingSnapshot);
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
      runtime = await attempt.identity.factory(attempt.identity.target);
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
    this.#publishSnapshot(attempt, Object.freeze({ status: 'ready', target: attempt.identity.target, runtime }));
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
    if (attempt.active) this.#publishSnapshot(attempt, Object.freeze({ status: 'failed', failure }));
  }

  #publishSnapshot(attempt: MountAttempt<Target, Runtime>, snapshot: RuntimeMountSnapshot<Target, Runtime>): void {
    this.#publish(Object.freeze({ identity: attempt.identity, snapshot }));
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
  useLayoutEffect(() => {
    reportFailureRef.current = reportFailure;
  }, [reportFailure]);
  const [target, setTarget] = useState<Target | null>(null);
  const [publication, setPublication] = useState<MountPublication<Target, Runtime>>(() =>
    Object.freeze({ identity: undefined, snapshot: pendingSnapshot }),
  );
  const sequenceRef = useRef<RuntimeMountSequence<Target, Runtime> | null>(null);
  if (!sequenceRef.current) {
    sequenceRef.current = new RuntimeMountSequence(setPublication, (failure) => reportFailureRef.current(failure));
  }
  const attachedTargetRef = useRef<Target | null>(null);

  const ref = useCallback((nextTarget: Target | null) => {
    const attachedTarget = attachedTargetRef.current;
    if (nextTarget !== null && attachedTarget !== null && nextTarget !== attachedTarget) {
      throw new Error('Runtime Mount ref cannot be attached to more than one React Target at a time.');
    }
    attachedTargetRef.current = nextTarget;
    setTarget(nextTarget);
  }, []);

  useLayoutEffect(() => {
    if (target === null) {
      setPublication(Object.freeze({ identity: undefined, snapshot: pendingSnapshot }));
      return;
    }
    return sequenceRef.current?.mount(target, factory);
  }, [factory, target]);

  const snapshot =
    target !== null && publication.identity?.target === target && publication.identity.factory === factory
      ? publication.snapshot
      : pendingSnapshot;
  return useMemo(() => Object.freeze({ ref, snapshot }), [ref, snapshot]);
}

function createFailure(phase: RuntimeMountFailure['phase'], error: unknown): RuntimeMountFailure {
  return Object.freeze({ phase, error });
}
