export function collectCleanupError(errors: unknown[], error: unknown): void {
  if (error instanceof AggregateError) {
    for (const nestedError of error.errors) {
      collectCleanupError(errors, nestedError);
    }
  } else {
    errors.push(error);
  }
}
