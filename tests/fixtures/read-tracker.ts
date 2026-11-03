/**
 * Wraps caller input so a test can see which own properties a public boundary read more than once.
 * A second read of the same path is where a getter or Proxy can return a value other than the one validated.
 * Array `length` is not counted: the repository contract concerns property and element values.
 * Frozen values are returned unwrapped: they cannot change between reads and may carry identity brands.
 */
export function trackReads<T extends object>(value: T, root = 'input') {
  const reads = new Map<string, number>();
  const proxies = new WeakMap<object, object>();

  const wrap = (target: object, path: string): object => {
    const known = proxies.get(target);
    if (known) return known;
    const proxy = new Proxy(target, {
      get(object, key, receiver) {
        const result = Reflect.get(object, key, receiver);
        if (typeof key === 'symbol' || !Object.hasOwn(object, key)) return result;
        if (Array.isArray(object) && key === 'length') return result;
        const child = Array.isArray(object) && /^\d+$/.test(key) ? `${path}[${key}]` : `${path}.${key}`;
        reads.set(child, (reads.get(child) ?? 0) + 1);
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        const fixed = descriptor && !descriptor.configurable && descriptor.writable === false;
        return result !== null && typeof result === 'object' && !fixed && !Object.isFrozen(result)
          ? wrap(result, child)
          : result;
      },
    });
    proxies.set(target, proxy);
    return proxy;
  };

  return {
    input: wrap(value, root) as T,
    reads: reads as ReadonlyMap<string, number>,
    repeated: () =>
      [...reads]
        .filter(([, count]) => count > 1)
        .map(([path, count]) => `${path} ×${count}`)
        .sort(),
  };
}
