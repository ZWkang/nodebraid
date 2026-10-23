import type { CanvasDocumentDataCodec } from '@nodebraid/core';

type ExampleData = null | Readonly<{ label: string; tags: readonly string[] }>;

export function acceptExampleData(value: unknown): ExampleData {
  if (value === null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const keys = Reflect.ownKeys(value);
    const label: unknown = Reflect.get(value, 'label');
    const tags: unknown = Reflect.get(value, 'tags');
    if (
      keys.length === 2 &&
      keys.includes('label') &&
      keys.includes('tags') &&
      typeof label === 'string' &&
      Array.isArray(tags)
    ) {
      const capturedTags: string[] = [];
      const length = tags.length;
      for (let index = 0; index < length; index += 1) {
        const tag: unknown = tags[index];
        if (typeof tag !== 'string') throw invalidExampleData();
        capturedTags.push(tag);
      }
      return Object.freeze({ label, tags: Object.freeze(capturedTags) });
    }
  }
  throw invalidExampleData();
}

function invalidExampleData(): TypeError {
  return new TypeError('Example data must be null or an object with a string label and an array of string tags.');
}

export const exampleDataCodec: CanvasDocumentDataCodec = Object.freeze({
  format: 'nodebraid.examples/data-v1',
  encode(data: unknown): string {
    return JSON.stringify(acceptExampleData(data));
  },
  decode(text: string): ExampleData {
    return acceptExampleData(JSON.parse(text));
  },
});
