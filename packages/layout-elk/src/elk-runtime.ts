import type { ELK } from 'elkjs/lib/elk-api.js';

let elkPromise: Promise<ELK> | undefined;

export function getElk(): Promise<ELK> {
  elkPromise ??= createElk();
  return elkPromise;
}

async function createElk(): Promise<ELK> {
  const selfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const bunRuntime = Reflect.get(globalThis, 'Bun') !== undefined;
  if (bunRuntime && !Reflect.deleteProperty(globalThis, 'self')) {
    throw new Error('ELK cannot initialize because the Bun self global is not configurable.');
  }
  try {
    const module = await import('elkjs/lib/elk.bundled.js');
    return new module.default();
  } finally {
    if (bunRuntime && selfDescriptor) Object.defineProperty(globalThis, 'self', selfDescriptor);
  }
}
