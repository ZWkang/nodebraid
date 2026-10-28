import type {
  BoxSelectionInteractionProjection,
  ConnectionPreviewInteractionProjection,
  NodeDragInteractionProjection,
} from '@nodebraid/interaction-api';
import type {
  CanvasCommit,
  CanvasEdge,
  CanvasNode,
  CanvasSnapshot,
  CanvasView,
  GraphChange,
  NodeId,
} from '@nodebraid/kernel';
import { RendererError } from '@nodebraid/renderer-api';
import type { PortSnapshot } from '@nodebraid/port-api';
import type { SessionSnapshot } from '@nodebraid/session-api';

import { validateCanvasView, validateSessionSnapshot } from './renderer-state';
import { getNodePortGeometries, resolveConnectionAnchorPoint, resolveEdgeEndpointPoint } from './port-geometry';
import type { NodeContentBuilder } from './node-content';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** @internal */
export function renderReset(
  view: CanvasView,
  document: Document,
  edgesLayer: SVGGElement,
  nodesLayer: SVGGElement,
  interactionLayer: SVGGElement,
  ports: PortSnapshot,
  nodeContent?: NodeContentBuilder,
): void {
  validateCanvasView(view);
  const nodes = view.snapshot.nodes.map((node) => createNodeElement(document, node, nodeContent));
  const nodesById = new Map(view.snapshot.nodes.map((node) => [node.id, node]));
  const edges = view.snapshot.edges.map((edge) => createEdgeElement(document, edge, nodesById, ports));
  const targets = view.snapshot.nodes.flatMap((node) => createConnectionTargetElements(document, node, ports));
  edgesLayer.replaceChildren(...edges);
  nodesLayer.replaceChildren(...nodes);
  interactionLayer.replaceChildren(...targets);
}

/** @internal */
export function applyCommit(
  commit: CanvasCommit,
  baselineSnapshot: CanvasSnapshot | undefined,
  acceptedSession: SessionSnapshot | undefined,
  document: Document,
  edgesLayer: SVGGElement,
  nodesLayer: SVGGElement,
  interactionLayer: SVGGElement,
  ports: PortSnapshot,
  nodeContent: NodeContentBuilder | undefined,
  completeProjection?: (journal: DomMutationJournal) => void,
): void {
  validateCanvasView(commit.before);
  validateCanvasView(commit.after);
  const baselineRevision = baselineSnapshot?.revision;
  const beforeRevision = commit.before.snapshot.revision;
  const afterRevision = commit.after.snapshot.revision;
  if (
    baselineRevision === undefined ||
    beforeRevision !== baselineRevision ||
    afterRevision !== beforeRevision + 1 ||
    commit.changeSet.beforeRevision !== beforeRevision ||
    commit.changeSet.revision !== afterRevision
  ) {
    throw new RendererError('DOCUMENT_OUT_OF_SYNC', 'SVG Renderer Commit is not contiguous with its Baseline.', {
      expectedRevision: baselineRevision ?? null,
      receivedRevision: beforeRevision,
    });
  }
  if (!canvasSnapshotsEqual(baselineSnapshot, commit.before.snapshot)) {
    throw new RendererError('DOCUMENT_OUT_OF_SYNC', 'SVG Renderer Commit before View differs from its Baseline.', {
      issue: 'BASELINE_CONTENT_MISMATCH',
      expectedRevision: baselineRevision,
      receivedRevision: beforeRevision,
    });
  }
  validateChangeSetConsistency(commit);
  if (acceptedSession) validateSessionSnapshot(acceptedSession, commit.after.snapshot);
  const afterNodesById = new Map(commit.after.snapshot.nodes.map((node) => [node.id, node]));
  const beforeNodesById = new Map(baselineSnapshot?.nodes.map((node) => [node.id, node]));
  const validatedNodes = new Map(
    commit.after.snapshot.nodes.map(
      (node) => [node.id, createNodeElement(document, node, nodeContent, beforeNodesById.get(node.id))] as const,
    ),
  );
  const validatedEdges = new Map(
    commit.after.snapshot.edges.map(
      (edge) => [edge.id, createEdgeElement(document, edge, afterNodesById, ports)] as const,
    ),
  );
  const changedNodeIds = new Set(
    commit.changeSet.changes.filter((change) => change.entity === 'node').map((change) => change.id),
  );
  const journal = new DomMutationJournal(edgesLayer, nodesLayer, interactionLayer);
  try {
    for (const change of commit.changeSet.changes) {
      if (change.entity === 'node') applyNodeChange(change, validatedNodes, nodesLayer, journal);
      else applyEdgeChange(change, validatedEdges, edgesLayer, journal);
    }
    for (const edge of commit.after.snapshot.edges) {
      if (!changedNodeIds.has(edge.source.nodeId) && !changedNodeIds.has(edge.target.nodeId)) continue;
      const existing = requireEntityElement(edgesLayer, 'data-nodebraid-edge-id', edge.id);
      const validated = requireMapValue(validatedEdges, edge.id);
      copyGeometryAttributes(validated, existing, ['x1', 'y1', 'x2', 'y2'], journal);
    }
    nodesLayer.append(
      ...commit.after.snapshot.nodes.map((node) => requireEntityElement(nodesLayer, 'data-nodebraid-node-id', node.id)),
    );
    edgesLayer.append(
      ...commit.after.snapshot.edges.map((edge) => requireEntityElement(edgesLayer, 'data-nodebraid-edge-id', edge.id)),
    );
    syncConnectionTargets(commit.after.snapshot.nodes, document, interactionLayer, ports, journal);
    completeProjection?.(journal);
  } catch (error) {
    const rollbackErrors = journal.rollback();
    if (rollbackErrors.length > 0) {
      throw new ProjectionRollbackError([error, ...rollbackErrors]);
    }
    throw error;
  }
}

function syncConnectionTargets(
  nodes: readonly CanvasNode[],
  document: Document,
  interactionLayer: SVGGElement,
  ports: PortSnapshot,
  journal: DomMutationJournal,
): void {
  const ordered: SVGCircleElement[] = [];
  const existingTargets = Array.from(
    interactionLayer.querySelectorAll<SVGCircleElement>(
      '[data-nodebraid-connection-anchor-node-id], [data-nodebraid-port-node-id]',
    ),
  );
  const existingTargetsByKey = new Map(existingTargets.map((element) => [connectionTargetKey(element), element]));
  for (const node of nodes) {
    for (const candidate of createConnectionTargetElements(document, node, ports)) {
      const key = connectionTargetKey(candidate);
      const existing = existingTargetsByKey.get(key);
      if (existing) {
        copyGeometryAttributes(candidate, existing, ['cx', 'cy'], journal);
        ordered.push(existing);
        existingTargetsByKey.delete(key);
      } else {
        ordered.push(candidate);
      }
    }
  }
  for (const element of existingTargetsByKey.values()) element.remove();
  interactionLayer.append(...ordered, ...interactionLayer.querySelectorAll('[data-nodebraid-connection-preview]'));
}

function createConnectionTargetElements(
  document: Document,
  node: CanvasNode,
  ports: PortSnapshot,
): readonly SVGCircleElement[] {
  const size = node.size;
  if (!size || size.width <= 0 || size.height <= 0) return [];
  const portGeometries = getNodePortGeometries(node, ports);
  if (portGeometries.length > 0) {
    return portGeometries.map((geometry) => {
      const element = createSvgElement(document, 'circle');
      element.setAttribute('class', 'nodebraid-renderer-svg__port');
      element.setAttribute('data-nodebraid-port-node-id', node.id);
      element.setAttribute('data-nodebraid-port-id', geometry.portId);
      element.setAttribute('data-nodebraid-port-role', geometry.role);
      element.setAttribute('cx', String(geometry.worldPoint.x));
      element.setAttribute('cy', String(geometry.worldPoint.y));
      return element;
    });
  }
  return (['target', 'source'] as const).map((role) => {
    const element = createSvgElement(document, 'circle');
    element.setAttribute('class', 'nodebraid-renderer-svg__connection-anchor');
    element.setAttribute('data-nodebraid-connection-anchor-node-id', node.id);
    element.setAttribute('data-nodebraid-connection-anchor-role', role);
    element.setAttribute('cx', String(role === 'source' ? node.position.x + size.width : node.position.x));
    element.setAttribute('cy', String(node.position.y + size.height / 2));
    return element;
  });
}

function connectionTargetKey(element: SVGElement): string {
  const portNodeId = element.getAttribute('data-nodebraid-port-node-id');
  if (portNodeId !== null) {
    return `port\u0000${portNodeId}\u0000${element.getAttribute('data-nodebraid-port-id')}\u0000${element.getAttribute('data-nodebraid-port-role')}`;
  }
  return `anchor\u0000${element.getAttribute('data-nodebraid-connection-anchor-node-id')}\u0000${element.getAttribute('data-nodebraid-connection-anchor-role')}`;
}

/** @internal */
export function applyConnectionPreview(
  preview: ConnectionPreviewInteractionProjection,
  snapshot: CanvasSnapshot,
  ports: PortSnapshot,
  interactionLayer: SVGGElement,
  journal: DomMutationJournal,
): void {
  const source = resolveConnectionAnchorPoint(snapshot, ports, preview.source);
  let endpoint = preview.pointerWorldPoint;
  if (preview.target.type !== 'none') {
    const targetAnchor = preview.target.anchor;
    endpoint = resolveConnectionAnchorPoint(snapshot, ports, targetAnchor);
  }
  let element = interactionLayer.querySelector<SVGLineElement>('[data-nodebraid-connection-preview]');
  if (!element) {
    element = createSvgElement(interactionLayer.ownerDocument, 'line');
    element.setAttribute('class', 'nodebraid-renderer-svg__connection-preview');
    element.setAttribute('data-nodebraid-connection-preview', '');
    interactionLayer.append(element);
  }
  setElementAttribute(element, 'x1', String(source.x), journal);
  setElementAttribute(element, 'y1', String(source.y), journal);
  setElementAttribute(element, 'x2', String(endpoint.x), journal);
  setElementAttribute(element, 'y2', String(endpoint.y), journal);
  setElementAttribute(element, 'data-nodebraid-connection-target', preview.target.type, journal);
}

/** @internal */
export function clearConnectionPreview(interactionLayer: SVGGElement): void {
  interactionLayer.querySelector('[data-nodebraid-connection-preview]')?.remove();
}

/** @internal */
export function applyBoxSelection(
  projection: BoxSelectionInteractionProjection,
  interactionLayer: SVGGElement,
  journal: DomMutationJournal,
): void {
  let element = interactionLayer.querySelector<SVGRectElement>('[data-nodebraid-box-selection]');
  if (!element) {
    element = createSvgElement(interactionLayer.ownerDocument, 'rect');
    element.setAttribute('class', 'nodebraid-renderer-svg__box-selection');
    element.setAttribute('data-nodebraid-box-selection', '');
    interactionLayer.append(element);
  }
  setElementAttribute(element, 'x', String(projection.rect.x), journal);
  setElementAttribute(element, 'y', String(projection.rect.y), journal);
  setElementAttribute(element, 'width', String(projection.rect.width), journal);
  setElementAttribute(element, 'height', String(projection.rect.height), journal);
}

/** @internal */
export function clearBoxSelection(interactionLayer: SVGGElement): void {
  interactionLayer.querySelector('[data-nodebraid-box-selection]')?.remove();
}

/** @internal */
export function applyNodeDragProjection(
  projection: NodeDragInteractionProjection,
  baselineSnapshot: CanvasSnapshot,
  edgesLayer: SVGGElement,
  nodesLayer: SVGGElement,
  ports: PortSnapshot,
  suppliedJournal?: DomMutationJournal,
): void {
  const journal = suppliedJournal ?? new DomMutationJournal(edgesLayer, nodesLayer);
  try {
    const candidates = new Map(projection.nodes.map((candidate) => [candidate.nodeId, candidate]));
    const effectiveNodes = new Map(
      baselineSnapshot.nodes.map((node) => {
        const candidate = candidates.get(node.id);
        return [node.id, candidate ? { ...node, position: candidate.position } : node] as const;
      }),
    );
    for (const candidate of projection.nodes) {
      const element = requireEntityElement(nodesLayer, 'data-nodebraid-node-id', candidate.nodeId);
      updateNodePosition(element, candidate.position, journal);
    }
    for (const edge of baselineSnapshot.edges) {
      if (!candidates.has(edge.source.nodeId) && !candidates.has(edge.target.nodeId)) continue;
      const existing = requireEntityElement(edgesLayer, 'data-nodebraid-edge-id', edge.id) as SVGLineElement;
      const validated = createEdgeElement(edgesLayer.ownerDocument, edge, effectiveNodes, ports);
      copyGeometryAttributes(validated, existing, ['x1', 'y1', 'x2', 'y2'], journal);
    }
  } catch (error) {
    if (suppliedJournal) throw error;
    const rollbackErrors = journal.rollback();
    if (rollbackErrors.length > 0) throw new ProjectionRollbackError([error, ...rollbackErrors]);
    throw error;
  }
}

function applyNodeChange(
  change: Extract<CanvasCommit['changeSet']['changes'][number], { readonly entity: 'node' }>,
  validatedNodes: ReadonlyMap<NodeId, SVGElement>,
  nodesLayer: SVGGElement,
  journal: DomMutationJournal,
): void {
  const existing = findEntityElement<SVGElement>(nodesLayer, 'data-nodebraid-node-id', change.id);
  if (change.before === null && change.after !== null) {
    if (existing) throwBaselineEntityConflict('node', change.id, 'missing', 'present');
    nodesLayer.append(requireMapValue(validatedNodes, change.id));
    return;
  }
  if (change.before !== null && change.after === null) {
    if (!existing) throwBaselineEntityConflict('node', change.id, 'present', 'missing');
    existing.remove();
    return;
  }
  if (!existing || change.after === null) throwBaselineEntityConflict('node', change.id, 'present', 'missing');
  updateNodeElement(existing, change.after, journal);
  const validated = requireMapValue(validatedNodes, change.id);
  if (existing.localName === 'g' && validated.firstChild) {
    journal.replaceChildren(existing, [...validated.childNodes]);
  }
}

function applyEdgeChange(
  change: Extract<CanvasCommit['changeSet']['changes'][number], { readonly entity: 'edge' }>,
  validatedEdges: ReadonlyMap<string, SVGLineElement>,
  edgesLayer: SVGGElement,
  journal: DomMutationJournal,
): void {
  const existing = findEntityElement<SVGLineElement>(edgesLayer, 'data-nodebraid-edge-id', change.id);
  if (change.before === null && change.after !== null) {
    if (existing) throwBaselineEntityConflict('edge', change.id, 'missing', 'present');
    edgesLayer.append(requireMapValue(validatedEdges, change.id));
    return;
  }
  if (change.before !== null && change.after === null) {
    if (!existing) throwBaselineEntityConflict('edge', change.id, 'present', 'missing');
    existing.remove();
    return;
  }
  if (!existing || change.after === null) throwBaselineEntityConflict('edge', change.id, 'present', 'missing');
  const validated = requireMapValue(validatedEdges, change.id);
  copyGeometryAttributes(validated, existing, ['x1', 'y1', 'x2', 'y2'], journal);
}

function createNodeElement(
  document: Document,
  node: CanvasNode,
  nodeContent?: NodeContentBuilder,
  previous?: CanvasNode,
): SVGElement {
  if (!node.size) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Node projection requires an explicit Size.', {
      issue: 'MISSING_NODE_SIZE',
      nodeId: node.id,
    });
  }
  const element = nodeContent ? createSvgElement(document, 'g') : createSvgElement(document, 'rect');
  element.setAttribute('class', 'nodebraid-renderer-svg__node');
  element.setAttribute('data-nodebraid-node-id', node.id);
  updateNodeElement(element, node);
  if (
    nodeContent &&
    (!previous ||
      previous.type !== node.type ||
      previous.size?.width !== node.size.width ||
      previous.size.height !== node.size.height ||
      !Object.is(previous.data, node.data))
  ) {
    element.append(nodeContent(node, node.size, document));
  }
  return element;
}

function updateNodeElement(element: SVGElement, node: CanvasNode, journal?: DomMutationJournal): void {
  if (!node.size) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Node projection requires an explicit Size.', {
      issue: 'MISSING_NODE_SIZE',
      nodeId: node.id,
    });
  }
  updateNodePosition(element, node.position, journal);
  if (element.localName === 'rect') {
    setElementAttribute(element, 'width', String(node.size.width), journal);
    setElementAttribute(element, 'height', String(node.size.height), journal);
  }
}

function updateNodePosition(element: SVGElement, position: CanvasNode['position'], journal?: DomMutationJournal): void {
  if (element.localName === 'g') {
    setElementAttribute(element, 'transform', `translate(${position.x} ${position.y})`, journal);
  } else {
    setElementAttribute(element, 'x', String(position.x), journal);
    setElementAttribute(element, 'y', String(position.y), journal);
  }
}

function createEdgeElement(
  document: Document,
  edge: CanvasEdge,
  nodesById: ReadonlyMap<NodeId, CanvasNode>,
  ports: PortSnapshot,
): SVGLineElement {
  if (edge.source.nodeId === edge.target.nodeId) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Renderer cannot project a self-loop as a straight Edge.', {
      issue: 'UNSUPPORTED_SELF_LOOP',
      edgeId: edge.id,
    });
  }
  const source = resolveEdgeEndpointPoint(nodesById, ports, edge.source, 'source', edge.id);
  const target = resolveEdgeEndpointPoint(nodesById, ports, edge.target, 'target', edge.id);
  const element = createSvgElement(document, 'line');
  element.setAttribute('class', 'nodebraid-renderer-svg__edge');
  element.setAttribute('data-nodebraid-edge-id', edge.id);
  element.setAttribute('x1', String(source.x));
  element.setAttribute('y1', String(source.y));
  element.setAttribute('x2', String(target.x));
  element.setAttribute('y2', String(target.y));
  return element;
}

/** @internal */
export function createSvgElement<Name extends keyof SVGElementTagNameMap>(
  document: Document,
  name: Name,
): SVGElementTagNameMap[Name] {
  return document.createElementNS(SVG_NAMESPACE, name);
}

/** @internal */
export function setSelected(element: SVGElement, selected: boolean, journal?: DomMutationJournal): void {
  if (selected) setElementAttribute(element, 'data-nodebraid-selected', 'true', journal);
  else removeElementAttribute(element, 'data-nodebraid-selected', journal);
}

function findEntityElement<ElementType extends SVGElement>(
  layer: SVGGElement,
  attribute: string,
  id: string,
): ElementType | undefined {
  return Array.from(layer.children).find((element) => element.getAttribute(attribute) === id) as
    ElementType | undefined;
}

function requireEntityElement(layer: SVGGElement, attribute: string, id: string): SVGElement {
  const element = findEntityElement(layer, attribute, id);
  if (!element) throwBaselineEntityConflict(attribute.includes('node') ? 'node' : 'edge', id, 'present', 'missing');
  return element;
}

function requireMapValue<Key, Value>(map: ReadonlyMap<Key, Value>, key: Key): Value {
  const value = map.get(key);
  if (!value) throw new Error('Validated SVG Projection value is missing.');
  return value;
}

function copyGeometryAttributes(
  source: SVGElement,
  target: SVGElement,
  attributes: readonly string[],
  journal?: DomMutationJournal,
): void {
  for (const attribute of attributes) {
    const value = source.getAttribute(attribute);
    if (value === null) removeElementAttribute(target, attribute, journal);
    else setElementAttribute(target, attribute, value, journal);
  }
}

function throwBaselineEntityConflict(
  entity: 'node' | 'edge',
  id: string,
  expectedState: 'missing' | 'present',
  actualState: 'missing' | 'present',
): never {
  throw new RendererError('DOCUMENT_OUT_OF_SYNC', 'SVG Renderer Baseline entity state does not match the Commit.', {
    entity,
    id,
    expectedState,
    actualState,
  });
}

/** @internal */
export class DomMutationJournal {
  readonly #edgeChildren: readonly Element[];
  readonly #nodeChildren: readonly Element[];
  readonly #interactionChildren: readonly Element[] | undefined;
  readonly #undos: (() => void)[] = [];

  constructor(
    readonly edgesLayer: SVGGElement,
    readonly nodesLayer: SVGGElement,
    readonly interactionLayer?: SVGGElement,
  ) {
    this.#edgeChildren = [...edgesLayer.children];
    this.#nodeChildren = [...nodesLayer.children];
    this.#interactionChildren = interactionLayer ? [...interactionLayer.children] : undefined;
  }

  setAttribute(element: SVGElement, name: string, value: string): void {
    const previous = element.getAttribute(name);
    if (previous === value) return;
    this.#undos.push(() => {
      if (previous === null) element.removeAttribute(name);
      else element.setAttribute(name, previous);
    });
    element.setAttribute(name, value);
  }

  removeAttribute(element: SVGElement, name: string): void {
    const previous = element.getAttribute(name);
    if (previous === null) return;
    this.#undos.push(() => element.setAttribute(name, previous));
    element.removeAttribute(name);
  }

  replaceChildren(element: SVGElement, children: readonly Node[]): void {
    const previous = [...element.childNodes];
    this.#undos.push(() => element.replaceChildren(...previous));
    element.replaceChildren(...children);
  }

  rollback(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const undo of [...this.#undos].reverse()) {
      try {
        undo();
      } catch (error) {
        errors.push(error);
      }
    }
    const layers: ReadonlyArray<readonly [SVGGElement, readonly Element[]]> = [
      [this.edgesLayer, this.#edgeChildren],
      [this.nodesLayer, this.#nodeChildren],
      ...(this.interactionLayer && this.#interactionChildren
        ? ([[this.interactionLayer, this.#interactionChildren]] as const)
        : []),
    ];
    for (const [layer, children] of layers) {
      try {
        layer.replaceChildren(...children);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }
}

/** @internal */
export class ProjectionRollbackError extends AggregateError {
  constructor(errors: readonly unknown[]) {
    super(errors, 'SVG Renderer Projection update and DOM rollback both failed.');
  }
}

/** @internal */
export function setElementAttribute(
  element: SVGElement,
  name: string,
  value: string,
  journal?: DomMutationJournal,
): void {
  if (journal) journal.setAttribute(element, name, value);
  else element.setAttribute(name, value);
}

function removeElementAttribute(element: SVGElement, name: string, journal?: DomMutationJournal): void {
  if (journal) journal.removeAttribute(element, name);
  else element.removeAttribute(name);
}

function canvasSnapshotsEqual(left: CanvasSnapshot | undefined, right: CanvasSnapshot): boolean {
  if (!left || left.revision !== right.revision) return false;
  if (left.nodes.length !== right.nodes.length || left.edges.length !== right.edges.length) return false;
  return (
    left.nodes.every((node, index) => canvasNodesEqual(node, right.nodes[index])) &&
    left.edges.every((edge, index) => canvasEdgesEqual(edge, right.edges[index]))
  );
}

function canvasNodesEqual(left: CanvasNode, right: CanvasNode | undefined): boolean {
  return (
    right !== undefined &&
    left.id === right.id &&
    left.type === right.type &&
    left.position.x === right.position.x &&
    left.position.y === right.position.y &&
    left.size?.width === right.size?.width &&
    left.size?.height === right.size?.height &&
    left.parentId === right.parentId &&
    Object.is(left.data, right.data)
  );
}

function canvasEdgesEqual(left: CanvasEdge, right: CanvasEdge | undefined): boolean {
  return (
    right !== undefined &&
    left.id === right.id &&
    left.type === right.type &&
    left.source.nodeId === right.source.nodeId &&
    left.source.portId === right.source.portId &&
    left.target.nodeId === right.target.nodeId &&
    left.target.portId === right.target.portId &&
    Object.is(left.data, right.data)
  );
}

function validateChangeSetConsistency(commit: CanvasCommit): void {
  const expected = collectGraphChanges(commit.before.snapshot, commit.after.snapshot);
  const actual = commit.changeSet.changes;
  if (expected.length === 0 && actual.length === 0) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Renderer Canvas Commit must contain a Change.', {
      issue: 'INVALID_DOCUMENT_COMMIT',
    });
  }
  if (
    expected.length === actual.length &&
    expected.every((change, index) => graphChangesEqual(change, actual[index]))
  ) {
    return;
  }
  throw new RendererError(
    'INVALID_DOCUMENT_UPDATE',
    'SVG Renderer Change Set does not match its before and after Views.',
    {
      issue: 'CHANGE_SET_MISMATCH',
      beforeRevision: commit.changeSet.beforeRevision,
      revision: commit.changeSet.revision,
    },
  );
}

function collectGraphChanges(before: CanvasSnapshot, after: CanvasSnapshot): readonly GraphChange[] {
  const changes: GraphChange[] = [];
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  for (const id of sortedUnion(beforeNodes.keys(), afterNodes.keys())) {
    const beforeNode = beforeNodes.get(id) ?? null;
    const afterNode = afterNodes.get(id) ?? null;
    if (canvasNodeValuesEqual(beforeNode, afterNode)) continue;
    changes.push({ entity: 'node', id, before: beforeNode, after: afterNode });
  }
  const beforeEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edge.id, edge]));
  for (const id of sortedUnion(beforeEdges.keys(), afterEdges.keys())) {
    const beforeEdge = beforeEdges.get(id) ?? null;
    const afterEdge = afterEdges.get(id) ?? null;
    if (canvasEdgeValuesEqual(beforeEdge, afterEdge)) continue;
    changes.push({ entity: 'edge', id, before: beforeEdge, after: afterEdge });
  }
  return changes;
}

function sortedUnion<Id extends string>(left: Iterable<Id>, right: Iterable<Id>): readonly Id[] {
  return [...new Set([...left, ...right])].sort();
}

function graphChangesEqual(left: GraphChange, right: GraphChange | undefined): boolean {
  if (!right || left.entity !== right.entity || left.id !== right.id) return false;
  if (left.entity === 'node' && right.entity === 'node') {
    return canvasNodeValuesEqual(left.before, right.before) && canvasNodeValuesEqual(left.after, right.after);
  }
  if (left.entity === 'edge' && right.entity === 'edge') {
    return canvasEdgeValuesEqual(left.before, right.before) && canvasEdgeValuesEqual(left.after, right.after);
  }
  return false;
}

function canvasNodeValuesEqual(left: CanvasNode | null, right: CanvasNode | null): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  return canvasNodesEqual(left, right);
}

function canvasEdgeValuesEqual(left: CanvasEdge | null, right: CanvasEdge | null): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  return canvasEdgesEqual(left, right);
}
