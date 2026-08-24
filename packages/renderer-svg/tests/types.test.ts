import { expect, test } from 'bun:test';

import { CFlowError } from '@cflow/diagnostics';
import type { CanvasRenderer } from '@cflow/renderer-api';

import { createSvgRenderer, SvgRendererError, type SvgRendererConfig, type SvgRendererErrorCode } from '../src';
import * as rendererSvgExports from '../src';

test('publishes a synchronous typed SVG Renderer Factory', () => {
  const verifyTypes = (target: SVGSVGElement, html: HTMLElement, config: SvgRendererConfig) => {
    const renderer: CanvasRenderer = createSvgRenderer({ target });
    const synchronous: CanvasRenderer = createSvgRenderer(config);
    // @ts-expect-error SVG Renderer requires an existing SVGSVGElement Target.
    createSvgRenderer({ target: html });
    // @ts-expect-error SVG Renderer config is readonly.
    config.edgeHitTolerance = 8;
    // @ts-expect-error SVG Renderer config is readonly.
    config.connectionAnchorHitTolerance = 12;
    return [renderer, synchronous];
  };
  void verifyTypes;

  expect('default' in rendererSvgExports).toBeFalse();
  expect('createRendererPlugin' in rendererSvgExports).toBeFalse();
  expect('rendererService' in rendererSvgExports).toBeFalse();
});

test('identifies SVG Provider failures structurally', () => {
  const codes: readonly SvgRendererErrorCode[] = [
    'INVALID_CONFIG',
    'INVALID_TARGET',
    'TARGET_OCCUPIED',
    'TARGET_UNAVAILABLE',
  ];
  // @ts-expect-error SvgRendererErrorCode is a closed union.
  const unsupportedCode: SvgRendererErrorCode = 'OTHER';
  void unsupportedCode;

  const error = new SvgRendererError('INVALID_TARGET', 'Target is invalid.', { field: 'target' });
  expect(codes).toHaveLength(4);
  expect(error).toBeInstanceOf(CFlowError);
  expect(error).toMatchObject({
    domain: 'renderer.svg',
    code: 'INVALID_TARGET',
    details: { field: 'target' },
  });
});
