// Input arrays must not control validation through map, iterator or species hooks.
export function mapArrayValues<Value>(values: readonly unknown[], project: (value: unknown) => Value): Value[] {
  return Array.from({ length: values.length }, (_, index) => project(values[index]));
}
