export function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
