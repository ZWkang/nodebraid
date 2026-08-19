import { SvgRendererError } from './svg-renderer-error';

/** @internal */
export interface AffineMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

/** @internal */
export function readTargetMatrix(
  target: SVGSVGElement,
  code: Extract<ConstructorParameters<typeof SvgRendererError>[0], 'INVALID_TARGET' | 'TARGET_UNAVAILABLE'>,
): AffineMatrix {
  const bounds = target.getBoundingClientRect();
  const matrix = target.getScreenCTM();
  const determinant = matrix ? matrix.a * matrix.d - matrix.b * matrix.c : Number.NaN;
  if (
    !target.isConnected ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    !matrix ||
    !Number.isFinite(determinant) ||
    determinant === 0
  ) {
    throw new SvgRendererError(code, 'SVG Renderer Target must be connected, measurable, and invertible.');
  }
  const inverse: AffineMatrix = {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
  const localToUser: AffineMatrix = {
    a: inverse.a,
    b: inverse.b,
    c: inverse.c,
    d: inverse.d,
    e: inverse.a * bounds.left + inverse.c * bounds.top + inverse.e,
    f: inverse.b * bounds.left + inverse.d * bounds.top + inverse.f,
  };
  if (Object.values(localToUser).every(Number.isFinite)) return localToUser;
  throw new SvgRendererError(code, 'SVG Renderer Target coordinate mapping must be finite.');
}

/** @internal */
export function formatSvgMatrix(matrix: AffineMatrix): string {
  return `matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map(formatMatrixNumber).join(' ')})`;
}

function formatMatrixNumber(value: number): string {
  const normalized = Math.abs(value) < 1e-12 ? 0 : Math.round(value * 1e12) / 1e12;
  return String(normalized);
}
