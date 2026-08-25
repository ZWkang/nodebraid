import type { Point } from '@nodebraid/kernel';

import type { WorldRect } from './contracts';

export function createWorldRect(start: Point, end: Point): WorldRect {
  return Object.freeze({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  });
}
