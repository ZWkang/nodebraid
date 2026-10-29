import type { CanvasNode, Size } from '@nodebraid/kernel';
import type { SvgNodeContentFactory } from './contracts';
import { SvgRendererError } from './svg-renderer-error';

/** @internal */
export type NodeContentBuilder = (node: CanvasNode, size: Size, document: Document) => SVGElement;

/** Owns every returned root, including roots discarded by an unsuccessful update. */
export function createNodeContentBuilder(factory: SvgNodeContentFactory): NodeContentBuilder {
  const owned = new WeakSet<SVGElement>();
  return (node, size, document) => {
    const root: unknown = factory(
      Object.freeze({
        nodeId: node.id,
        type: node.type,
        size: Object.freeze({ width: size.width, height: size.height }),
        data: node.data,
        document,
      }),
    );
    const element = acceptSvgElement(root, document, node.id);
    // Native getters establish DOM ownership even across realms or when a caller shadows a property.
    const parent = Object.getOwnPropertyDescriptor(document.defaultView!.Node.prototype, 'parentNode')!.get!.call(
      element,
    );
    if (parent !== null || owned.has(element)) {
      throw new SvgRendererError('INVALID_NODE_CONTENT', 'Node content must be a fresh, detached SVG root.', {
        nodeId: node.id,
        issue: 'CONTENT_ALREADY_OWNED',
      });
    }
    owned.add(element);
    return element;
  };
}

function acceptSvgElement(value: unknown, document: Document, nodeId: CanvasNode['id']): SVGElement {
  const namespaceGetter = Object.getOwnPropertyDescriptor(
    document.defaultView!.Element.prototype,
    'namespaceURI',
  )!.get!;
  let namespace: unknown;
  try {
    namespace = namespaceGetter.call(value);
  } catch (cause) {
    throw new SvgRendererError(
      'INVALID_NODE_CONTENT',
      'Node content must be a synchronous SVGElement.',
      { nodeId, issue: 'INVALID_ELEMENT' },
      { cause },
    );
  }
  if (namespace !== 'http://www.w3.org/2000/svg') {
    throw new SvgRendererError('INVALID_NODE_CONTENT', 'Node content must be an SVGElement.', {
      nodeId,
      issue: 'INVALID_ELEMENT',
    });
  }
  return value as SVGElement;
}
