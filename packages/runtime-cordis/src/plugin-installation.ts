import { collectCleanupError } from './cleanup-errors';
import type {
  ChildInstaller,
  DependencyCleanupReporter,
  RuntimeContext,
  RuntimeFiber,
  ServicePublisher,
} from './internal-contracts';
import { PluginActivation } from './plugin-activation';
import type {
  InstallationSnapshot,
  OwnedResourceDisposer,
  PendingInstallationSnapshot,
  PluginDefinition,
  PluginInstallation,
} from './plugin-contracts';
import { PluginHostError } from './plugin-host-error';
import { validateProvidedServices } from './provided-services';
import { getServiceName, type BoundServices, type ServiceBindings, type ServiceTokenBase } from './service-token';

export class CordisPluginInstallation implements PluginInstallation {
  #snapshot: InstallationSnapshot;
  readonly #listeners = new Set<() => void>();
  readonly #waiters = new Set<{
    readonly resolve: () => void;
    readonly reject: (error: unknown) => void;
    readonly signal?: AbortSignal;
    readonly onAbort?: () => void;
  }>();
  #fiber?: RuntimeFiber;
  #currentActivation?: PluginActivation<unknown, ServiceBindings, ServiceBindings>;
  #currentDeactivation?: OwnedResourceDisposer;
  readonly #cleanupErrors: unknown[] = [];
  #disposal?: Promise<void>;
  #disposeRequested = false;
  #failed = false;
  #terminalError?: unknown;

  constructor(
    private readonly definition: PluginDefinition<unknown, ServiceBindings, ServiceBindings>,
    private readonly config: unknown,
    missing: readonly ServiceTokenBase[],
    private readonly getMissing: () => readonly ServiceTokenBase[],
    private readonly installChild: ChildInstaller,
    private readonly publishService: ServicePublisher,
    private readonly reportDependencyCleanupError: DependencyCleanupReporter,
    private readonly onDisposed: () => void,
  ) {
    this.#snapshot = createPendingSnapshot(missing);
  }

  attachFiber(fiber: RuntimeFiber): void {
    this.#fiber = fiber;
  }

  getSnapshot(): InstallationSnapshot {
    return this.#snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  whenActive(signal?: AbortSignal): Promise<void> {
    if (this.#disposeRequested) {
      return Promise.reject(this.#disposedError());
    }
    if (this.#snapshot.status === 'active') return Promise.resolve();
    if (this.#snapshot.status === 'failed') {
      return Promise.reject(this.#snapshot.error);
    }
    if (signal?.aborted) return Promise.reject(getAbortReason(signal));
    return new Promise<void>((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        signal,
        onAbort: signal
          ? () => {
              this.#waiters.delete(waiter);
              reject(getAbortReason(signal));
            }
          : undefined,
      };
      if (waiter.onAbort) signal!.addEventListener('abort', waiter.onAbort, { once: true });
      this.#waiters.add(waiter);
    });
  }

  async activate(context: RuntimeContext): Promise<OwnedResourceDisposer> {
    if (this.#failed) throw this.#terminalError;
    const activation = new PluginActivation(this.definition, this.config, this.installChild, this.publishService);
    this.#currentActivation = activation;
    const requiredServiceNames = new Set(Object.values(this.definition.requires ?? {}).map(getServiceName));
    let disappearingServiceName: string | undefined;
    context.on('internal/service', (name) => {
      if (requiredServiceNames.has(name) && context.get(name) === undefined) {
        disappearingServiceName ??= name;
        activation.controller.abort();
      }
    });

    let providedServices: BoundServices<ServiceBindings>;
    try {
      providedServices = validateProvidedServices(
        this.definition.name,
        this.definition.provides ?? {},
        await activation.run(context),
      );
    } catch (error) {
      // An aborted signal alone does not make an arbitrary business failure a
      // cancellation. Only an explicit abort error may return to pending.
      if (
        activation.controller.signal.aborted &&
        isCancellationError(error, activation.controller.signal) &&
        (this.#disposeRequested || this.getMissing().length > 0)
      ) {
        try {
          await activation.dispose();
        } catch (cleanupError) {
          if (!this.#disposeRequested) {
            this.#failDependencyCleanup(activation, disappearingServiceName, cleanupError);
            return async () => {};
          }
          throw cleanupError;
        }
        if (!this.#disposeRequested) {
          this.#setSnapshot(createPendingSnapshot(this.getMissing()));
        }
        return async () => {};
      }
      this.#fail(error);
      throw error;
    }

    if (activation.controller.signal.aborted || this.#disposeRequested) {
      try {
        await activation.dispose();
      } catch (cleanupError) {
        if (!this.#disposeRequested) {
          this.#failDependencyCleanup(activation, disappearingServiceName, cleanupError);
          return async () => {};
        }
        throw cleanupError;
      }
      if (!this.#disposeRequested) {
        this.#setSnapshot(createPendingSnapshot(this.getMissing()));
      }
      return async () => {};
    }

    const withdrawals = activation.publishProvidedServices(providedServices);
    void Promise.resolve()
      .then(() => Promise.resolve(this.#fiber!))
      .then(() => {
        if (
          this.#currentActivation === activation &&
          !activation.controller.signal.aborted &&
          !this.#disposeRequested &&
          !this.#failed
        ) {
          this.#setSnapshot(Object.freeze({ status: 'active' }));
          this.#resolveWaiters();
        }
      })
      .catch((error: unknown) => {
        if (this.#disposeRequested || this.#failed) return;
        this.#fail(error);
      });

    let deactivation: Promise<void> | undefined;
    const deactivate = () => {
      deactivation ??= (async () => {
        activation.controller.abort();
        const dependencyDriven =
          !this.#disposeRequested && (disappearingServiceName !== undefined || this.getMissing().length > 0);
        if (dependencyDriven && !this.#failed) {
          // Stop advertising stale Service references before asynchronous
          // cleanup begins; cleanup may later move this pending state to failed.
          this.#setSnapshot(createPendingSnapshot(this.getMissing()));
        }
        const errors: unknown[] = [];
        for (const withdraw of withdrawals.reverse()) {
          try {
            await withdraw();
          } catch (error) {
            collectCleanupError(errors, error);
          }
        }
        try {
          await activation.dispose();
        } catch (error) {
          collectCleanupError(errors, error);
        }
        if (this.#currentActivation === activation) {
          this.#currentActivation = undefined;
          this.#currentDeactivation = undefined;
        }
        if (!this.#disposeRequested && !this.#failed && !dependencyDriven) {
          this.#setSnapshot(createPendingSnapshot(this.getMissing()));
        }
        if (errors.length) {
          const error = new AggregateError(errors, 'Plugin resource cleanup failed.');
          if (!this.#disposeRequested && dependencyDriven) {
            this.#failDependencyCleanup(activation, disappearingServiceName, error);
            return;
          }
          this.#cleanupErrors.push(...errors);
          if (!this.#disposeRequested) {
            this.#fail(error);
          }
          throw error;
        }
      })();
      return deactivation;
    };
    this.#currentDeactivation = deactivate;
    return deactivate;
  }

  dispose(): Promise<void> {
    if (!this.#disposal) {
      this.#disposeRequested = true;
      this.#rejectWaiters(this.#disposedError());
      this.#currentActivation?.controller.abort();
      const deactivation = this.#currentDeactivation?.();
      if (deactivation) {
        void Promise.resolve(deactivation).catch(() => {
          // The cached error is exposed after Cordis settles the Fiber below.
        });
      }
      this.#disposal = Promise.resolve()
        .then(() => this.#fiber!.dispose())
        .then(async () => {
          try {
            await this.#currentActivation?.dispose();
          } catch (error) {
            collectCleanupError(this.#cleanupErrors, error);
          }
          if (this.#cleanupErrors.length) {
            throw new AggregateError(this.#cleanupErrors, 'Plugin resource cleanup failed.');
          }
        })
        .then(
          () => {
            this.onDisposed();
            this.#setSnapshot(Object.freeze({ status: 'disposed' }));
          },
          (error: unknown) => {
            this.onDisposed();
            this.#setSnapshot(Object.freeze({ status: 'disposed' }));
            throw error;
          },
        );
    }
    return this.#disposal;
  }

  #setSnapshot(snapshot: InstallationSnapshot): void {
    if (this.#snapshot === snapshot) return;
    this.#snapshot = snapshot;
    for (const listener of this.#listeners) {
      try {
        listener();
      } catch (error) {
        reportSubscriberError(error);
      }
    }
  }

  #resolveWaiters(): void {
    for (const waiter of this.#waiters) {
      if (waiter.onAbort) waiter.signal!.removeEventListener('abort', waiter.onAbort);
      waiter.resolve();
    }
    this.#waiters.clear();
  }

  #rejectWaiters(error: unknown): void {
    for (const waiter of this.#waiters) {
      if (waiter.onAbort) waiter.signal!.removeEventListener('abort', waiter.onAbort);
      waiter.reject(error);
    }
    this.#waiters.clear();
  }

  #failDependencyCleanup(
    activation: PluginActivation<unknown, ServiceBindings, ServiceBindings>,
    disappearingServiceName: string | undefined,
    error: unknown,
  ): void {
    const aggregate =
      error instanceof AggregateError ? error : new AggregateError([error], 'Plugin resource cleanup failed.');
    if (this.#currentActivation === activation) this.#currentActivation = undefined;
    this.#fail(aggregate);
    const missingService = this.getMissing()[0];
    const serviceName = disappearingServiceName ?? (missingService ? getServiceName(missingService) : undefined);
    // Return dependency cleanup failures to the Service withdrawal that caused
    // them. Later Consumer/Host disposal must not report the same error again.
    if (serviceName) this.reportDependencyCleanupError(serviceName, aggregate);
  }

  #fail(error: unknown): void {
    this.#failed = true;
    this.#terminalError = error;
    this.#setSnapshot(Object.freeze({ status: 'failed', error }));
    this.#rejectWaiters(error);
  }

  #disposedError(): PluginHostError {
    return new PluginHostError('INSTALLATION_DISPOSED', 'Plugin Installation has been disposed.');
  }
}

function createPendingSnapshot(missing: readonly ServiceTokenBase[]): PendingInstallationSnapshot {
  return Object.freeze({
    status: 'pending',
    missing: Object.freeze([...missing]),
  });
}

function getAbortReason(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function isCancellationError(error: unknown, signal: AbortSignal): boolean {
  if (error === signal.reason) return true;
  return error instanceof Error && error.name === 'AbortError';
}

function reportSubscriberError(error: unknown): void {
  // Observer code is outside the Plugin lifecycle. Report it through the host
  // platform (or an asynchronous throw) without corrupting Installation state.
  if (typeof globalThis.reportError === 'function') {
    try {
      globalThis.reportError(error);
      return;
    } catch (reporterError) {
      error = new AggregateError([error, reporterError], 'Plugin subscriber error reporting failed.');
    }
  }
  queueMicrotask(() => {
    throw error;
  });
}
