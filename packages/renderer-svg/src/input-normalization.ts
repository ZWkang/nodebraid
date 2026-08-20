import {
  RendererError,
  type InputModifiers,
  type KeyboardInput,
  type PointerButton,
  type PointerInput,
  type PointerType,
  type WheelInput,
} from '@cflow/renderer-api';
import type { SessionSnapshot } from '@cflow/session-api';

import type { SvgDomEventPolicy } from './contracts';

/** @internal */
export function applyDomEventPolicy(event: Event, policy: Required<SvgDomEventPolicy>): void {
  if (policy.preventDefault) event.preventDefault();
  if (policy.stopPropagation) event.stopPropagation();
}

/** @internal */
export function normalizePointerInput(
  event: PointerEvent,
  target: SVGSVGElement,
  session: SessionSnapshot,
  type = normalizePointerInputType(event.type),
): PointerInput {
  const bounds = target.getBoundingClientRect();
  const screenPoint = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
  const viewport = session.viewport;
  return Object.freeze({
    type,
    pointerId: event.pointerId,
    pointerType: normalizePointerType(event.pointerType),
    screenPoint: Object.freeze(screenPoint),
    worldPoint: Object.freeze({
      x: (screenPoint.x - viewport.x) / viewport.zoom,
      y: (screenPoint.y - viewport.y) / viewport.zoom,
    }),
    button: type === 'pointer.move' || type === 'pointer.cancel' ? null : normalizePointerButton(event.button),
    pressedButtons: Object.freeze(normalizePressedButtons(event.buttons)),
    modifiers: normalizeInputModifiers(event),
  });
}

/** @internal */
export function normalizeWheelInput(event: WheelEvent, target: SVGSVGElement, session: SessionSnapshot): WheelInput {
  const bounds = target.getBoundingClientRect();
  const screenPoint = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
  const viewport = session.viewport;
  const factor =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? bounds.height
        : 1;
  return Object.freeze({
    type: 'wheel',
    screenPoint: Object.freeze(screenPoint),
    worldPoint: Object.freeze({
      x: (screenPoint.x - viewport.x) / viewport.zoom,
      y: (screenPoint.y - viewport.y) / viewport.zoom,
    }),
    deltaX: event.deltaX * factor,
    deltaY: event.deltaY * factor,
    modifiers: normalizeInputModifiers(event),
  });
}

/** @internal */
export function normalizeKeyboardInput(event: KeyboardEvent): KeyboardInput {
  return Object.freeze({
    type: event.type === 'keydown' ? 'key.down' : 'key.up',
    key: event.key,
    code: event.code,
    repeat: event.repeat,
    modifiers: normalizeInputModifiers(event),
  });
}

function normalizePointerInputType(type: string): PointerInput['type'] {
  switch (type) {
    case 'pointerdown':
      return 'pointer.down';
    case 'pointermove':
      return 'pointer.move';
    case 'pointerup':
      return 'pointer.up';
    case 'pointercancel':
      return 'pointer.cancel';
    default:
      throw new Error(`Unsupported Pointer event type: ${type}`);
  }
}

function normalizePointerType(type: string): PointerType {
  return type === 'mouse' || type === 'pen' || type === 'touch' ? type : 'unknown';
}

function normalizePointerButton(button: number): PointerButton | null {
  return (
    (
      {
        0: 'primary',
        1: 'auxiliary',
        2: 'secondary',
        3: 'back',
        4: 'forward',
      } as const
    )[button as 0 | 1 | 2 | 3 | 4] ?? null
  );
}

function normalizePressedButtons(buttons: number): readonly PointerButton[] {
  const pressed: PointerButton[] = [];
  if ((buttons & 1) !== 0) pressed.push('primary');
  if ((buttons & 4) !== 0) pressed.push('auxiliary');
  if ((buttons & 2) !== 0) pressed.push('secondary');
  if ((buttons & 8) !== 0) pressed.push('back');
  if ((buttons & 16) !== 0) pressed.push('forward');
  return pressed;
}

function normalizeInputModifiers(event: MouseEvent | KeyboardEvent): InputModifiers {
  return Object.freeze({
    alt: event.altKey,
    control: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  });
}

/** @internal */
export function assertActivePointer(pointerId: number, activePointerIds: ReadonlySet<number>): void {
  if (Number.isSafeInteger(pointerId) && pointerId >= 0 && activePointerIds.has(pointerId)) return;
  throw new RendererError('INVALID_POINTER', 'SVG Renderer Pointer must be active.', { pointerId });
}

/** @internal */
export function releaseNativePointerCapture(
  target: SVGSVGElement,
  pointerId: number,
  capturedPointerIds: Set<number>,
): void {
  if (!capturedPointerIds.has(pointerId)) return;
  capturedPointerIds.delete(pointerId);
  try {
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
  } catch (error) {
    capturedPointerIds.add(pointerId);
    throw error;
  }
}
