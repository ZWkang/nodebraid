import { deserializeCanvasDocument, establishHistoryBaselineCommand, serializeCanvasDocument } from '@nodebraid/core';

import type { ExampleRuntime } from './create-example-runtime';
import { exampleDataCodec } from './example-data-codec';

export function downloadExampleDocument(runtime: ExampleRuntime): void {
  const text = serializeCanvasDocument(runtime.kernel.read().snapshot, exampleDataCodec);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'nodebraid-document.json';
  try {
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function restoreExampleDocument(runtime: ExampleRuntime, text: string): Promise<void> {
  const document = deserializeCanvasDocument(text, exampleDataCodec);
  await runtime.commands.execute(establishHistoryBaselineCommand, (transaction) => {
    const current = runtime.kernel.read().snapshot;
    for (const edge of current.edges) transaction.edges.remove(edge.id);
    for (const node of current.nodes) transaction.nodes.remove(node.id);
    for (const node of document.nodes) transaction.nodes.add(node);
    for (const edge of document.edges) transaction.edges.add(edge);
  });
}
