export function reportSubscriberError(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    try {
      globalThis.reportError(error);
      return;
    } catch (reporterError) {
      error = new AggregateError([error, reporterError], 'Session subscriber error reporting failed.');
    }
  }
  queueMicrotask(() => {
    throw error;
  });
}
