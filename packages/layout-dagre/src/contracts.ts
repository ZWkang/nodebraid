export type DagreDirection = 'TB' | 'BT' | 'LR' | 'RL';

export interface DagreLayoutConfig {
  readonly direction?: DagreDirection;
  readonly nodeSpacing?: number;
  readonly edgeSpacing?: number;
  readonly rankSpacing?: number;
  readonly marginX?: number;
  readonly marginY?: number;
}
