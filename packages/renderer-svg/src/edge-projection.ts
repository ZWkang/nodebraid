import type { EdgeId } from '@nodebraid/kernel';
import type { EdgeGeometries, EdgeGeometry } from './edge-geometry';
import type { DomMutationJournal } from './svg-projection';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function createRoutedEdgeElement(document: Document, id: EdgeId, geometry: EdgeGeometry): SVGGElement {
  const element = document.createElementNS(SVG_NAMESPACE, 'g');
  element.setAttribute('class', 'nodebraid-renderer-svg__edge');
  element.setAttribute('data-nodebraid-edge-id', id);
  appendEdgeVisuals(element, geometry);
  return element;
}

export function appendEdgeVisuals(element: SVGGElement, geometry: EdgeGeometry): void {
  const document = element.ownerDocument;
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('class', 'nodebraid-renderer-svg__edge-path');
  path.setAttribute('data-nodebraid-edge-path', geometry.path);
  path.setAttribute('d', geometry.pathData);
  path.setAttribute('fill', 'none');
  const arrow = document.createElementNS(SVG_NAMESPACE, 'path');
  arrow.setAttribute('class', 'nodebraid-renderer-svg__edge-arrow');
  arrow.setAttribute('data-nodebraid-edge-arrow', '');
  arrow.setAttribute('d', geometry.arrowData);
  element.append(path, arrow);
  if (geometry.label !== undefined) {
    const label = document.createElementNS(SVG_NAMESPACE, 'text');
    label.setAttribute('class', 'nodebraid-renderer-svg__edge-label');
    label.setAttribute('data-nodebraid-edge-label', '');
    label.setAttribute('x', String(geometry.labelPoint.x));
    label.setAttribute('y', String(geometry.labelPoint.y));
    label.setAttribute('text-anchor', 'middle');
    label.textContent = geometry.label;
    element.append(label);
  }
}

export function prepareRoutedEdgeElements(
  document: Document,
  geometries: EdgeGeometries,
): ReadonlyMap<EdgeId, SVGGElement> {
  return new Map(Array.from(geometries, ([id, geometry]) => [id, createRoutedEdgeElement(document, id, geometry)]));
}

export function applyRoutedEdgeElements(
  candidates: ReadonlyMap<EdgeId, SVGGElement>,
  edgesLayer: SVGGElement,
  journal: DomMutationJournal,
): void {
  for (const existing of edgesLayer.children) {
    const id = existing.getAttribute('data-nodebraid-edge-id') as EdgeId;
    const candidate = candidates.get(id);
    if (!candidate) throw new Error('Accepted Edge Geometry is missing.');
    journal.replaceChildren(existing as SVGElement, [...candidate.childNodes]);
  }
}
