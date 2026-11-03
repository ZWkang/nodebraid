import type { CanvasSnapshot, EdgeEndpoint, EdgeId, Point } from '@nodebraid/kernel';
import type { PortSnapshot } from '@nodebraid/port-api';
import { RendererError } from '@nodebraid/renderer-api';
import type { SvgEdgeConfig, SvgEdgePath, SvgEdgePresentation } from './contracts';
import { resolveEdgeEndpointPoint } from './port-geometry';
import { SvgRendererError } from './svg-renderer-error';

export type EdgePresentations = ReadonlyMap<EdgeId, Readonly<SvgEdgePresentation>>;
export type EdgeGeometries = ReadonlyMap<EdgeId, EdgeGeometry>;

type Line = readonly [Point, Point];
type Cubic = readonly [Point, Point, Point, Point];

export interface EdgeGeometry {
  readonly path: SvgEdgePath;
  readonly segments: readonly (Line | Cubic)[];
  readonly pathData: string;
  readonly arrow: readonly [Point, Point, Point];
  readonly arrowData: string;
  readonly label?: string;
  readonly labelPoint: Point;
}

export function resolveEdgePresentations(snapshot: CanvasSnapshot, config: SvgEdgeConfig): EdgePresentations {
  return new Map(
    snapshot.edges.map((edge) => {
      const input = Object.freeze({
        ...edge,
        source: Object.freeze({ ...edge.source }),
        target: Object.freeze({ ...edge.target }),
      });
      const value: unknown = config.resolve(input);
      if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidPresentation(edge.id);
      const path: unknown = Reflect.get(value, 'path');
      const label: unknown = Reflect.get(value, 'label');
      if (
        (path !== 'orthogonal' && path !== 'bezier') ||
        (label !== undefined && typeof label !== 'string') ||
        Reflect.ownKeys(value).some((key) => key !== 'path' && key !== 'label')
      )
        invalidPresentation(edge.id);
      return [edge.id, Object.freeze({ path, ...(label === undefined ? {} : { label }) })] as const;
    }),
  );
}

function invalidPresentation(edgeId: EdgeId): never {
  throw new SvgRendererError(
    'INVALID_EDGE_PRESENTATION',
    'Edge presentation must contain a supported path and optional plain-text label.',
    { edgeId },
  );
}

export function createEdgeGeometries(
  snapshot: CanvasSnapshot,
  ports: PortSnapshot,
  presentations: EdgePresentations,
): EdgeGeometries {
  const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const groups = new Map<string, EdgeId[]>();
  for (const edge of snapshot.edges) {
    const key = endpointPair(edge.source, edge.target);
    const group = groups.get(key);
    if (group) group.push(edge.id);
    else groups.set(key, [edge.id]);
  }
  const lanes = new Map<EdgeId, { index: number; count: number }>();
  for (const group of groups.values()) {
    group.forEach((id, index) => lanes.set(id, { index, count: group.length }));
  }
  const result = new Map<EdgeId, EdgeGeometry>();
  for (const edge of snapshot.edges) {
    if (edge.source.nodeId === edge.target.nodeId) {
      throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Renderer does not support self-loop Edges.', {
        issue: 'UNSUPPORTED_SELF_LOOP',
        edgeId: edge.id,
      });
    }
    const source = resolveEdgeEndpointPoint(nodes, ports, edge.source, 'source', edge.id, true);
    const target = resolveEdgeEndpointPoint(nodes, ports, edge.target, 'target', edge.id, true);
    const lane = lanes.get(edge.id)!;
    const presentation = presentations.get(edge.id);
    if (!presentation) throw new Error('Accepted Edge presentation is missing.');
    const top = Math.min(nodes.get(edge.source.nodeId)!.position.y, nodes.get(edge.target.nodeId)!.position.y);
    result.set(edge.id, createEdgeGeometry(source, target, presentation, lane.index, lane.count, top));
  }
  return result;
}

function endpointPair(source: EdgeEndpoint, target: EdgeEndpoint): string {
  const identity = (endpoint: EdgeEndpoint) => JSON.stringify([endpoint.nodeId, endpoint.portId ?? null]);
  const a = identity(source),
    b = identity(target);
  return JSON.stringify(a < b ? [a, b] : [b, a]);
}

export function createEdgeGeometry(
  source: Point,
  target: Point,
  presentation: Readonly<SvgEdgePresentation>,
  laneIndex = 0,
  laneCount = 1,
  top = Math.min(source.y, target.y),
): EdgeGeometry {
  const stub = 24;
  const separateTurns = presentation.path === 'orthogonal' && laneCount > 1 && target.x - source.x <= stub * 2;
  const midpointX = source.x / 2 + target.x / 2;
  const laneY =
    target.x - source.x >= stub * 2 && !separateTurns
      ? source.y / 2 + target.y / 2 + (laneIndex - (laneCount - 1) / 2) * 24
      : top - 32 - laneIndex * 24;
  const middle = { x: midpointX, y: laneY };
  let segments: (Line | Cubic)[];
  if (presentation.path === 'orthogonal') {
    // When the entry/exit stubs meet, distinct turn columns and outer lanes keep siblings independently hittable.
    const turn = separateTurns ? stub * (laneIndex + 1) : stub;
    const points = [
      source,
      { x: source.x + turn, y: source.y },
      { x: source.x + turn, y: laneY },
      { x: target.x - turn, y: laneY },
      { x: target.x - turn, y: target.y },
      target,
    ];
    segments = points
      .slice(1)
      .map((point, index) => [points[index]!, point] as const)
      .filter(([start, end]) => start.x !== end.x || start.y !== end.y);
  } else {
    const bend = Math.max(stub, Math.abs(target.x / 2 - source.x / 2));
    segments = [
      [source, { x: source.x + bend, y: source.y }, { x: middle.x - bend / 2, y: middle.y }, middle],
      [middle, { x: middle.x + bend / 2, y: middle.y }, { x: target.x - bend, y: target.y }, target],
    ];
  }
  // Both routes approach the target from its left, matching the Provider's target Anchor/Port direction.
  const arrow = [target, { x: target.x - 10, y: target.y - 5 }, { x: target.x - 10, y: target.y + 5 }] as const;
  if (![...segments.flat(), ...arrow, middle].every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Edge Geometry must be finite.', {
      issue: 'NON_FINITE_EDGE_GEOMETRY',
    });
  }
  const pathData = `M ${pointText(source)} ${segments
    .map((segment) =>
      segment.length === 2
        ? `L ${pointText(segment[1])}`
        : `C ${pointText(segment[1])} ${pointText(segment[2])} ${pointText(segment[3])}`,
    )
    .join(' ')}`;
  return {
    path: presentation.path,
    segments,
    pathData,
    arrow,
    arrowData: `M ${pointText(arrow[0])} L ${pointText(arrow[1])} L ${pointText(arrow[2])} Z`,
    ...(presentation.label === undefined ? {} : { label: presentation.label }),
    labelPoint: middle,
  };
}

function pointText(point: Point): string {
  return `${point.x} ${point.y}`;
}

export function distanceToEdge(point: Point, geometry: EdgeGeometry): number {
  let distance = distanceToTriangle(point, geometry.arrow);
  for (const segment of geometry.segments) {
    distance = Math.min(
      distance,
      segment.length === 2 ? distanceToSegment(point, segment[0], segment[1]) : distanceToCubic(point, segment),
    );
  }
  return distance;
}

function distanceToTriangle(point: Point, triangle: readonly [Point, Point, Point]): number {
  const [a, b, c] = triangle;
  const cross = (start: Point, end: Point) =>
    (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
  const values = [cross(a, b), cross(b, c), cross(c, a)];
  const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (area !== 0 && (values.every((value) => value >= 0) || values.every((value) => value <= 0))) return 0;
  return Math.min(distanceToSegment(point, a, b), distanceToSegment(point, b, c), distanceToSegment(point, c, a));
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const dx = (end.x - start.x) / length,
    dy = (end.y - start.y) / length;
  const along = Math.max(0, Math.min(length, (point.x - start.x) * dx + (point.y - start.y) * dy));
  return Math.hypot(point.x - start.x - along * dx, point.y - start.y - along * dy);
}

function distanceToCubic(point: Point, curve: Cubic): number {
  const translated = curve.map((control) => ({ x: control.x - point.x, y: control.y - point.y }));
  const scale = Math.max(...translated.flatMap((control) => [Math.abs(control.x), Math.abs(control.y)]));
  if (scale === 0) return 0;
  const [p0, p1, p2, p3] = translated.map((control) => ({ x: control.x / scale, y: control.y / scale })) as [
    Point,
    Point,
    Point,
    Point,
  ];
  const subtract = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
  const d0 = subtract(p1, p0),
    d1 = subtract(p2, p1),
    d2 = subtract(p3, p2);
  const a = { x: d2.x - 2 * d1.x + d0.x, y: d2.y - 2 * d1.y + d0.y };
  const b = { x: 3 * (d1.x - d0.x), y: 3 * (d1.y - d0.y) };
  const c = { x: 3 * d0.x, y: 3 * d0.y };
  const dot = (left: Point, right: Point) => left.x * right.x + left.y * right.y;
  // Stationary squared-distance points: (B(t) - point) · B'(t) = 0.
  const polynomial = [
    dot(p0, c),
    dot(c, c) + 2 * dot(p0, b),
    3 * dot(p0, a) + 3 * dot(c, b),
    4 * dot(c, a) + 2 * dot(b, b),
    5 * dot(a, b),
    3 * dot(a, a),
  ];
  let distance = Number.POSITIVE_INFINITY;
  for (const t of [0, 1, ...polynomialRoots(polynomial)]) {
    const value = cubicPoint([p0, p1, p2, p3], t);
    distance = Math.min(distance, Math.hypot(value.x, value.y) * scale);
  }
  return distance;
}

function cubicPoint(curve: Cubic, t: number): Point {
  const mix = (a: Point, b: Point) => ({ x: a.x * (1 - t) + b.x * t, y: a.y * (1 - t) + b.y * t });
  const a = mix(curve[0], curve[1]),
    b = mix(curve[1], curve[2]),
    c = mix(curve[2], curve[3]);
  return mix(mix(a, b), mix(b, c));
}

function polynomialRoots(coefficients: readonly number[]): number[] {
  let degree = coefficients.length - 1;
  while (degree > 0 && coefficients[degree] === 0) degree -= 1;
  if (degree === 0) return [];
  if (degree === 1) {
    const root = -coefficients[0]! / coefficients[1]!;
    return root > 0 && root < 1 ? [root] : [];
  }
  const derivative = coefficients.slice(1, degree + 1).map((value, index) => value * (index + 1));
  const boundaries = [0, ...polynomialRoots(derivative), 1];
  const evaluate = (t: number): number => {
    let value = coefficients[degree]!;
    for (let index = degree - 1; index >= 0; index -= 1) value = value * t + coefficients[index]!;
    return value;
  };
  const roots: number[] = [];
  for (let index = 1; index < boundaries.length; index += 1) {
    let left = boundaries[index - 1]!,
      right = boundaries[index]!;
    let leftValue = evaluate(left);
    const rightValue = evaluate(right);
    if (leftValue === 0) roots.push(left);
    if (rightValue === 0) {
      roots.push(right);
      continue;
    }
    if (leftValue === 0 || Math.sign(leftValue) === Math.sign(rightValue)) continue;
    // Derivative roots partition monotone intervals. Stop at adjacent representable parameters, not an iteration cap.
    while (true) {
      const middle = left + (right - left) / 2;
      if (middle === left || middle === right) {
        roots.push(middle);
        break;
      }
      const value = evaluate(middle);
      if (value === 0) {
        roots.push(middle);
        break;
      }
      if (Math.sign(value) === Math.sign(leftValue)) {
        left = middle;
        leftValue = value;
      } else right = middle;
    }
  }
  return roots;
}
