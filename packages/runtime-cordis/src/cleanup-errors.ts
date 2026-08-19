export function collectCleanupError(errors: unknown[], error: unknown): void {
  errors.push(error);
}
