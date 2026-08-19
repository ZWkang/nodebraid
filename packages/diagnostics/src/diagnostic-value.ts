export type DiagnosticValue =
  null | boolean | number | string | readonly DiagnosticValue[] | Readonly<{ [key: string]: DiagnosticValue }>;

export type DiagnosticAttributes = Readonly<Record<string, DiagnosticValue>>;
export type NonFiniteNumberDescription = 'nan' | 'positive-infinity' | 'negative-infinity';

export function describeNonFiniteNumber(value: number): NonFiniteNumberDescription {
  if (Number.isNaN(value)) return 'nan';
  if (value === Number.POSITIVE_INFINITY) return 'positive-infinity';
  if (value === Number.NEGATIVE_INFINITY) return 'negative-infinity';
  throw new RangeError(`Expected a non-finite number; received ${String(value)}.`);
}

export class DiagnosticValueError extends TypeError {
  override readonly name = 'DiagnosticValueError';

  constructor(
    message: string,
    readonly details: DiagnosticAttributes,
  ) {
    super(message);
    this.details = Object.freeze({ ...details });
  }
}

export function normalizeDiagnosticAttributes<Attributes extends DiagnosticAttributes>(
  attributes: Attributes,
): Attributes {
  return copyAndFreezeDiagnosticValue(attributes, 'attributes', new Map()) as Attributes;
}

export function copyAndFreezeDiagnosticDetails<Attributes extends DiagnosticAttributes>(
  attributes: Attributes,
): Attributes {
  return copyAndFreezeDiagnosticValue(attributes, 'details', new Map()) as Attributes;
}

function copyAndFreezeDiagnosticValue(value: unknown, path: string, ancestors: Map<object, string>): DiagnosticValue {
  if (typeof value === 'object' && value !== null) {
    const firstPath = ancestors.get(value);
    if (firstPath) {
      throw new DiagnosticValueError(`Diagnostic value at ${path} must not be circular; first seen at ${firstPath}.`, {
        path,
        issue: 'CIRCULAR',
        firstPath,
      });
    }
    ancestors.set(value, path);
    try {
      if (Array.isArray(value)) {
        return Object.freeze(
          value.map((item, index) => copyAndFreezeDiagnosticValue(item, `${path}[${index}]`, ancestors)),
        );
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        const constructorName = prototype?.constructor?.name || 'object';
        throw new DiagnosticValueError(
          `Diagnostic value at ${path} must be a plain record; received ${constructorName}.`,
          { path, issue: 'NON_PLAIN_OBJECT', receivedClass: constructorName },
        );
      }
      const symbolKey = Object.getOwnPropertySymbols(value)[0];
      if (symbolKey) {
        throw new DiagnosticValueError(
          `Diagnostic value at ${path} must use string keys; received ${String(symbolKey)}.`,
          { path, issue: 'SYMBOL_KEY', receivedKey: String(symbolKey) },
        );
      }
      return Object.freeze(
        Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => {
              const propertyPath = `${path}.${key}`;
              const descriptor = Object.getOwnPropertyDescriptor(value, key);
              if (!descriptor || !('value' in descriptor)) {
                throw new DiagnosticValueError(
                  `Diagnostic value at ${propertyPath} must use a data property; received accessor.`,
                  { path: propertyPath, issue: 'ACCESSOR_PROPERTY' },
                );
              }
              return [key, copyAndFreezeDiagnosticValue(descriptor.value, propertyPath, ancestors)];
            }),
        ),
      );
    } finally {
      ancestors.delete(value);
    }
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new DiagnosticValueError(`Diagnostic value at ${path} must be finite; received ${String(value)}.`, {
        path,
        issue: 'NON_FINITE_NUMBER',
        receivedNumber: describeNonFiniteNumber(value),
      });
    }
    return Object.is(value, -0) ? 0 : value;
  }
  throw new DiagnosticValueError(`Diagnostic value at ${path} must be JSON-safe; received ${typeof value}.`, {
    path,
    issue: 'UNSAFE_TYPE',
    receivedType: typeof value,
  });
}
