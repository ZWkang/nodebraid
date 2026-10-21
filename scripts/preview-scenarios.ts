export const previewScenes = [
  { id: 'viewport', title: 'Viewport zoom and reset' },
  { id: 'selection-history', title: 'Selection, duplication and history' },
  { id: 'port-connection', title: 'Connect source and target Ports' },
  { id: 'clipboard', title: 'Copy and paste through the system clipboard' },
] as const;

export type PreviewScene = (typeof previewScenes)[number];

export function selectPreviewScenes(files: readonly string[], all = false): readonly PreviewScene[] {
  if (all) return previewScenes;
  const selected = new Set<PreviewScene['id']>();
  for (const file of files) {
    if (/\/(tests|browser-tests|artifacts)\//.test(file) || /\.(test|browser)\.[^.]+$/.test(file)) continue;
    if (/^packages\/(plugin-duplicate-selection|plugin-history)\/src\//.test(file)) {
      selected.add('selection-history');
    } else if (/^packages\/(port-api|plugin-port)\/src\//.test(file)) {
      selected.add('port-connection');
    } else if (/^packages\/(plugin-clipboard|canvas-fragment)\/src\//.test(file)) {
      selected.add('clipboard');
    } else if (
      /^(src\/|packages\/[^/]+\/src\/|examples\/app\/src\/)/.test(file) ||
      /^(package\.json|bun\.lock|packages\/[^/]+\/package\.json|examples\/app\/(package\.json|index\.html|vite\.config\.ts))$/.test(
        file,
      ) ||
      /^scripts\/(collect-preview|preview-scenarios)\.ts$/.test(file) ||
      file.startsWith('.agents/skills/verify-nodebraid/')
    ) {
      return previewScenes;
    }
  }
  return previewScenes.filter((scene) => selected.has(scene.id));
}

export function previewLimitations(files: readonly string[]): string[] {
  const limitations: string[] = [];
  if (files.some((file) => /^packages\/(layout-[^/]+|plugin-layout)\//.test(file))) {
    limitations.push(
      'The Examples Application has no Layout control. These scenes cover existing Canvas behavior, not Layout execution.',
    );
  }
  if (files.some((file) => file.startsWith('website/'))) {
    limitations.push(
      'Documentation Site changes are outside these Examples Application scenes; run docs:check separately.',
    );
  }
  return limitations;
}
