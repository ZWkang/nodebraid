import type { SvgDomEventPolicy, SvgInputPolicies, SvgRendererConfig } from './contracts';
import { SvgRendererError } from './svg-renderer-error';

/** @internal */
export interface NormalizedInputPolicies {
  readonly pointer: Required<SvgDomEventPolicy>;
  readonly wheel: Required<SvgDomEventPolicy>;
  readonly keyboard: Required<SvgDomEventPolicy>;
  readonly contextMenu: Required<SvgDomEventPolicy>;
}

/** @internal */
export function validateConfig(config: Readonly<SvgRendererConfig>): SVGSVGElement {
  if (typeof config !== 'object' || config === null) {
    throw new SvgRendererError('INVALID_CONFIG', 'SVG Renderer config must be an object.');
  }
  assertKnownConfigKeys(config, ['target', 'edgeHitTolerance', 'connectionAnchorHitTolerance', 'input'], '');
  const target = (config as Readonly<{ target?: unknown }>).target;
  const ownerDocument = isRecord(target) ? Reflect.get(target, 'ownerDocument') : undefined;
  const ownerWindow = isRecord(ownerDocument) ? Reflect.get(ownerDocument, 'defaultView') : undefined;
  if (
    !isRecord(ownerWindow) ||
    typeof ownerWindow.SVGSVGElement !== 'function' ||
    !(target instanceof ownerWindow.SVGSVGElement)
  ) {
    throw new SvgRendererError('INVALID_TARGET', 'SVG Renderer Target must be an SVGSVGElement.');
  }
  if (
    config.edgeHitTolerance !== undefined &&
    (!Number.isFinite(config.edgeHitTolerance) || config.edgeHitTolerance < 0)
  ) {
    throw new SvgRendererError('INVALID_CONFIG', 'edgeHitTolerance must be a finite non-negative number.', {
      field: 'edgeHitTolerance',
    });
  }
  if (
    config.connectionAnchorHitTolerance !== undefined &&
    (!Number.isFinite(config.connectionAnchorHitTolerance) || config.connectionAnchorHitTolerance < 0)
  ) {
    throw new SvgRendererError('INVALID_CONFIG', 'connectionAnchorHitTolerance must be a finite non-negative number.', {
      field: 'connectionAnchorHitTolerance',
    });
  }
  return target as SVGSVGElement;
}

/** @internal */
export function normalizeInputPolicies(input: unknown): NormalizedInputPolicies {
  if (input !== undefined && !isRecord(input)) {
    throw new SvgRendererError('INVALID_CONFIG', 'SVG Renderer input policy must be an object.', { field: 'input' });
  }
  if (input !== undefined) {
    assertKnownConfigKeys(input, ['pointer', 'wheel', 'keyboard', 'contextMenu'], 'input');
  }
  const policies = input as SvgInputPolicies | undefined;
  return {
    pointer: normalizeDomEventPolicy(policies?.pointer, 'pointer'),
    wheel: normalizeDomEventPolicy(policies?.wheel, 'wheel'),
    keyboard: normalizeDomEventPolicy(policies?.keyboard, 'keyboard'),
    contextMenu: normalizeDomEventPolicy(policies?.contextMenu, 'contextMenu'),
  };
}

function normalizeDomEventPolicy(policy: unknown, field: string): Required<SvgDomEventPolicy> {
  if (policy !== undefined && !isRecord(policy)) {
    throw new SvgRendererError('INVALID_CONFIG', 'SVG Renderer DOM event policy must be an object.', { field });
  }
  if (policy !== undefined) assertKnownConfigKeys(policy, ['preventDefault', 'stopPropagation'], `input.${field}`);
  const normalized = policy as SvgDomEventPolicy | undefined;
  for (const key of ['preventDefault', 'stopPropagation'] as const) {
    if (normalized?.[key] !== undefined && typeof normalized[key] !== 'boolean') {
      throw new SvgRendererError('INVALID_CONFIG', 'SVG Renderer DOM event policy values must be boolean.', {
        field: `${field}.${key}`,
      });
    }
  }
  return {
    preventDefault: normalized?.preventDefault ?? false,
    stopPropagation: normalized?.stopPropagation ?? false,
  };
}

function assertKnownConfigKeys(value: object, allowedKeys: readonly string[], prefix: string): void {
  const allowed = new Set(allowedKeys);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'string' && allowed.has(key)) continue;
    const field =
      typeof key === 'string' ? (prefix.length === 0 ? key : `${prefix}.${key}`) : `${prefix || 'config'}.[symbol]`;
    throw new SvgRendererError('INVALID_CONFIG', 'SVG Renderer config contains an unknown field.', { field });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
