export type ElkLayoutAlgorithm = 'layered' | 'stress';
export type ElkLayoutDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface ElkLayoutConfig {
  readonly algorithm?: ElkLayoutAlgorithm;
  readonly direction?: ElkLayoutDirection;
  readonly nodeSpacing?: number;
  readonly layerSpacing?: number;
  readonly padding?: number;
  /** Safe integer seed; omitted values and zero use the fixed default seed 1. */
  readonly randomSeed?: number;
}
