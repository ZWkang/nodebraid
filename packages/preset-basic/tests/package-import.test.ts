import { expect, test } from 'bun:test';

test('package-name import exposes the Basic Canvas Composition factory', async () => {
  const packageExports = await import('@cflow/preset-basic');

  expect(packageExports.createBasicCanvasPlugin).toBeFunction();
  expect(Object.keys(packageExports)).toEqual(['createBasicCanvasPlugin']);
});
