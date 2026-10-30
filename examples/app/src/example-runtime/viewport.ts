import type { CanvasNode, Size, Viewport } from '@nodebraid/core';

export const exampleZoomRange = Object.freeze({ minZoom: 0.25, maxZoom: 4 });

export function zoomViewportAtCenter(current: Viewport, targetSize: Size, factor: number): Viewport {
  const anchor = { x: targetSize.width / 2, y: targetSize.height / 2 };
  const zoom = clampZoom(current.zoom * factor);
  const worldX = (anchor.x - current.x) / current.zoom;
  const worldY = (anchor.y - current.y) / current.zoom;
  return { x: anchor.x - worldX * zoom, y: anchor.y - worldY * zoom, zoom };
}

export function fitViewport(nodes: readonly CanvasNode[], targetSize: Size): Viewport | null {
  if (nodes.length === 0) return null;
  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + (node.size?.width ?? 0)));
  const maxY = Math.max(...nodes.map((node) => node.position.y + (node.size?.height ?? 0)));
  const padding = 48;
  const zoom = clampZoom(
    Math.min((targetSize.width - padding * 2) / (maxX - minX), (targetSize.height - padding * 2) / (maxY - minY)),
  );
  return {
    x: (targetSize.width - (maxX - minX) * zoom) / 2 - minX * zoom,
    y: (targetSize.height - (maxY - minY) * zoom) / 2 - minY * zoom,
    zoom,
  };
}

function clampZoom(value: number): number {
  return Math.min(exampleZoomRange.maxZoom, Math.max(exampleZoomRange.minZoom, value));
}
