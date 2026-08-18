export type PlainRecordInspection =
  | { readonly status: 'invalid-value' }
  | { readonly status: 'invalid-prototype' }
  | { readonly status: 'invalid-key'; readonly key: PropertyKey }
  | { readonly status: 'valid'; readonly record: object; readonly keys: readonly string[] };

export function inspectPlainRecord(
  value: unknown,
  arrayStatus: 'invalid-value' | 'invalid-prototype',
): PlainRecordInspection {
  if (!value || typeof value !== 'object') return { status: 'invalid-value' };
  if (Array.isArray(value)) return { status: arrayStatus };

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return { status: 'invalid-prototype' };
  }

  const keys: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return { status: 'invalid-key', key };
    keys.push(key);
  }
  return { status: 'valid', record: value, keys };
}
