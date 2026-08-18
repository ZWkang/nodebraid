export function reportObserverError(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    try {
      globalThis.reportError(error);
      return;
    } catch (reporterError) {
      error = new AggregateError([error, reporterError], 'Kernel Commit Observer error reporting failed.');
    }
  }
  queueMicrotask(() => {
    throw error;
  });
}
