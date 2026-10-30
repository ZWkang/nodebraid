import { expect, test } from 'bun:test';
import { nodeId, type CanvasNode } from '@nodebraid/core';

import { fitViewport, zoomViewportAtCenter } from '../src/example-runtime/viewport';

test('center zoom preserves the world point at the middle of the measured Target', () => {
  const current = Object.freeze({ x: 60, y: -40, zoom: 2 });

  expect(zoomViewportAtCenter(current, { width: 400, height: 320 }, 0.5)).toEqual({
    x: 130,
    y: 60,
    zoom: 1,
  });
});

test('center zoom keeps the same anchor when it reaches the application zoom limits', () => {
  const current = { x: 0, y: 0, zoom: 1 };
  const targetSize = { width: 400, height: 320 };

  expect(zoomViewportAtCenter(current, targetSize, 100)).toEqual({ x: -600, y: -480, zoom: 4 });
  expect(zoomViewportAtCenter(current, targetSize, 0.001)).toEqual({ x: 150, y: 120, zoom: 0.25 });
});

test('Fit View fits the limiting dimension and centers Node bounds with 48 CSS pixels of padding', () => {
  const nodes: readonly CanvasNode[] = [
    { id: nodeId('left'), type: 'step', position: { x: -100, y: -50 }, size: { width: 100, height: 100 }, data: null },
    { id: nodeId('right'), type: 'step', position: { x: 100, y: 50 }, size: { width: 100, height: 100 }, data: null },
  ];

  expect(fitViewport(nodes, { width: 696, height: 696 })).toEqual({ x: 248, y: 248, zoom: 2 });
});

test('Fit View returns no update for an empty Document', () => {
  expect(fitViewport([], { width: 400, height: 300 })).toBeNull();
});

test('Fit View treats missing Node size as zero and retains the maximum zoom', () => {
  const node: CanvasNode = { id: nodeId('point'), type: 'note', position: { x: 10, y: 20 }, data: null };

  expect(fitViewport([node], { width: 400, height: 300 })).toEqual({ x: 160, y: 70, zoom: 4 });
  expect(fitViewport([{ ...node, size: { width: 0, height: 0 } }], { width: 400, height: 300 })).toEqual({
    x: 160,
    y: 70,
    zoom: 4,
  });
});

test('Fit View retains the minimum zoom even when the graph is larger than the Target', () => {
  const node: CanvasNode = {
    id: nodeId('large'),
    type: 'step',
    position: { x: 0, y: 0 },
    size: { width: 2000, height: 1000 },
    data: null,
  };

  expect(fitViewport([node], { width: 400, height: 300 })).toEqual({ x: -50, y: 25, zoom: 0.25 });
});
