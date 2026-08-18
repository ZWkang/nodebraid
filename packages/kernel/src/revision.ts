/** Returns null rather than emitting an unsafe integer that would break revision identity. */
export function incrementRevision(revision: number): number | null {
  return revision === Number.MAX_SAFE_INTEGER ? null : revision + 1;
}
