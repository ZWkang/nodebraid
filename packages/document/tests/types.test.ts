import { test } from 'bun:test';

import { deserializeCanvasDocument, type CanvasDocumentDataCodec } from '../src';

test('keeps decoded Document structure readonly and business data opaque', () => {
  const verifyTypes = (codec: CanvasDocumentDataCodec) => {
    const document = deserializeCanvasDocument('', codec);
    // @ts-expect-error A decoded Document has no local runtime revision.
    void document.revision;
    // @ts-expect-error A decoded Document collection cannot be replaced.
    document.nodes = [];
    // @ts-expect-error Decoded Node collections remain readonly.
    document.nodes.pop();
    // @ts-expect-error Callers must narrow opaque data themselves.
    const label: string = document.nodes[0]!.data.label;
    void label;
    // @ts-expect-error Encoding must explicitly produce application text.
    const invalid: CanvasDocumentDataCodec = { format: 'invalid', encode: () => undefined, decode: () => null };
    void invalid;
  };
  void verifyTypes;
});
