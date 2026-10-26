import { createCanvasKernel } from '@nodebraid/kernel';
import type { CanvasRenderer, RendererInput } from '@nodebraid/renderer-api';
import { createSvgRenderer, type SvgDomEventPolicy } from '../src';

export type PolicyFamily = 'pointer' | 'wheel' | 'keyboard' | 'contextMenu';
export type PolicyFlag = 'preventDefault' | 'stopPropagation';
export type PolicyMode = 'first-true' | 'first-false' | 'first-absent';
export type PolicyPropertyKind = 'own' | 'inherited' | 'non-enumerable';
export type PolicyFailure = 'invalid-null' | 'invalid-number' | 'invalid-string' | `throw-${number}`;
interface NativePolicyResult {
  readonly case: string;
  readonly reads: number;
  readonly receiverCorrect: boolean;
  readonly targetEvent:
    { readonly isTrusted: boolean; readonly defaultPrevented: boolean; readonly cancelBubble: boolean } | undefined;
  readonly bubbled: number;
  readonly semanticInputs: number;
}
let current:
  | {
      readonly renderer: CanvasRenderer;
      readonly outer: HTMLDivElement;
      readonly stop: () => void;
      readonly ready: Promise<void>;
      readonly read: () => NativePolicyResult;
    }
  | undefined;

function createPolicyTarget() {
  const outer = document.createElement('div');
  outer.style.position = 'fixed';
  outer.style.inset = '0';
  document.body.append(outer);
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  outer.append(target);
  return { outer, target };
}

export function setupPolicyCase(
  family: PolicyFamily,
  flag: PolicyFlag,
  mode: PolicyMode,
  kind: PolicyPropertyKind,
): { x: number; y: number } {
  if (current) throw new Error('Previous policy case was not cleaned up.');
  const { outer, target } = createPolicyTarget();
  const policy: SvgDomEventPolicy = { preventDefault: false, stopPropagation: false };
  let reads = 0;
  let receiverCorrect = true;
  const holder = kind === 'inherited' ? Object.create(Object.getPrototypeOf(policy)) : policy;
  if (kind === 'inherited') Reflect.deleteProperty(policy, flag);
  Object.defineProperty(holder, flag, {
    enumerable: kind !== 'non-enumerable',
    get() {
      receiverCorrect &&= this === policy;
      reads += 1;
      if (reads > 1) throw new Error('Policy value was read after capture.');
      return mode === 'first-absent' ? undefined : mode === 'first-true';
    },
  });
  if (kind === 'inherited') Object.setPrototypeOf(policy, holder);
  const renderer = createSvgRenderer({ target, input: { [family]: policy } });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
  const inputs: RendererInput[] = [];
  const stop = renderer.subscribeInput((input) => {
    inputs.push(input);
  });
  renderer.focus();
  let resolve!: () => void;
  const ready = new Promise<void>((complete) => {
    resolve = complete;
  });
  let targetEvent: NativePolicyResult['targetEvent'];
  let bubbled = 0;
  const eventType =
    family === 'pointer'
      ? 'pointerdown'
      : family === 'keyboard'
        ? 'keydown'
        : family === 'contextMenu'
          ? 'contextmenu'
          : 'wheel';
  target.addEventListener(
    eventType,
    (event) => {
      targetEvent = {
        isTrusted: event.isTrusted,
        defaultPrevented: event.defaultPrevented,
        cancelBubble: event.cancelBubble,
      };
      resolve();
    },
    { passive: true },
  );
  outer.addEventListener(
    eventType,
    () => {
      bubbled += 1;
    },
    { passive: true },
  );
  const inputType =
    family === 'pointer' ? 'pointer.down' : family === 'keyboard' ? 'key.down' : family === 'wheel' ? 'wheel' : null;
  current = {
    renderer,
    outer,
    stop,
    ready,
    read: () => ({
      case: [family, flag, mode, kind].join(':'),
      reads,
      receiverCorrect,
      targetEvent,
      bubbled,
      semanticInputs: inputType === null ? 0 : inputs.filter((input) => input.type === inputType).length,
    }),
  };
  const bounds = target.getBoundingClientRect();
  return { x: bounds.left + 80, y: bounds.top + 80 };
}

export async function readPolicyCase(): Promise<NativePolicyResult> {
  if (!current) throw new Error('Expected a policy case.');
  await current.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return current.read();
}

export async function cleanupPolicyCase(): Promise<void> {
  if (!current) throw new Error('Expected a policy case to clean up.');
  const owned = current;
  current = undefined;
  owned.stop();
  await owned.renderer.dispose();
  owned.outer.remove();
}

export async function policyConstructorFailure(family: PolicyFamily, flag: PolicyFlag, scenario: PolicyFailure) {
  const { outer, target } = createPolicyTarget();
  const caller = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  target.append(caller);
  const before = target.outerHTML;
  const policy: SvgDomEventPolicy = { preventDefault: false, stopPropagation: false };
  let reads = 0;
  let receiverCorrect = true;
  let laterFlagReads = 0;
  const originals: readonly unknown[] = [undefined, null, false, 0, '', Symbol('original policy read')];
  const throws = scenario.startsWith('throw-');
  const original = originals[Number(scenario.slice('throw-'.length))];
  if (flag === 'preventDefault') {
    Object.defineProperty(policy, 'stopPropagation', {
      enumerable: true,
      get() {
        laterFlagReads += 1;
        throw new Error('First policy failure must precede the later field.');
      },
    });
  }
  Object.defineProperty(policy, flag, {
    enumerable: true,
    get() {
      receiverCorrect &&= this === policy;
      reads += 1;
      if (throws) throw original;
      if (reads > 1) return true;
      return scenario === 'invalid-null' ? null : scenario === 'invalid-number' ? 0 : 'yes';
    },
  });
  let renderer: CanvasRenderer | undefined;
  let received: unknown;
  let didThrow = false;
  try {
    renderer = createSvgRenderer({ target, input: { [family]: policy } });
  } catch (error) {
    received = error;
    didThrow = true;
  }
  const result = {
    case: [family, flag, scenario].join(':'),
    reads,
    receiverCorrect,
    laterFlagReads,
    code: typeof received === 'object' && received !== null && 'code' in received ? String(received.code) : null,
    field:
      typeof received === 'object' && received !== null && 'details' in received
        ? (received.details as { readonly field?: unknown }).field
        : null,
    originalError: throws && didThrow && Object.is(received, original),
    targetUnchanged: target.outerHTML === before,
  };
  await renderer?.dispose();
  const replacement = createSvgRenderer({ target });
  await replacement.dispose();
  const reusable = target.contains(caller) && target.outerHTML === before;
  outer.remove();
  return { ...result, reusable };
}
