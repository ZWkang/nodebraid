import { expect, test } from 'bun:test';

import { NodeBraidError } from '@nodebraid/diagnostics';
import type { CanvasRenderer } from '@nodebraid/renderer-api';

import {
  createSvgRenderer,
  SvgRendererError,
  type SvgRendererConfig,
  type SvgRendererErrorCode,
  type SvgNodeContentContext,
  type SvgNodeContentFactory,
} from '../src';
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
    'INVALID_NODE_CONTENT',
  ];
  // @ts-expect-error SvgRendererErrorCode is a closed union.
  const unsupportedCode: SvgRendererErrorCode = 'OTHER';
  void unsupportedCode;

  const error = new SvgRendererError('INVALID_TARGET', 'Target is invalid.', { field: 'target' });
  expect(codes).toHaveLength(5);
  expect(error).toBeInstanceOf(NodeBraidError);
  expect(error).toMatchObject({
    domain: 'renderer.svg',
    code: 'INVALID_TARGET',
    details: { field: 'target' },
  });
});

test('publishes synchronous application-owned SVG Node content without exposing geometry writes', () => {
  const verifyTypes = (target: SVGSVGElement, context: SvgNodeContentContext) => {
    const content: SvgNodeContentFactory = ({ document, data, size }) => {
      const root = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      root.textContent = String(data);
      root.setAttribute('x', String(size.width / 2));
      return root;
    };
    createSvgRenderer({ target, createNodeContent: content });
    // @ts-expect-error Content construction must finish synchronously.
    const asynchronous: SvgNodeContentFactory = async () => content(context);
    // @ts-expect-error HTML is not SVG Node content.
    const html: SvgNodeContentFactory = () => target.ownerDocument.createElement('div');
    // @ts-expect-error Node positions belong to the Provider, not content construction.
    void context.position;
    // @ts-expect-error Context geometry is immutable.
    context.size.width = 10;
    // @ts-expect-error Application data remains opaque.
    void context.data.label;
    return [asynchronous, html];
  };
  void verifyTypes;
  expect('SvgNodeContentContext' in rendererSvgExports).toBeFalse();
});
