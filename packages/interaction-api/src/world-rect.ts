import type { Point } from '@nodebraid/kernel';

import type { WorldRect } from './contracts';

export function createWorldRect(start: Point, end: Point): WorldRect {
  const { x: startX, y: startY } = start;
  const { x: endX, y: endY } = end;
  return Object.freeze({
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  });
}
