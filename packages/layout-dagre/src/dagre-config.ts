import type { DagreDirection, DagreLayoutConfig } from './contracts';

export interface EffectiveDagreLayoutConfig {
  readonly direction: DagreDirection;
  readonly nodeSpacing: number;
  readonly edgeSpacing: number;
  readonly rankSpacing: number;
  readonly marginX: number;
  readonly marginY: number;
}

export function resolveDagreLayoutConfig(config: DagreLayoutConfig): EffectiveDagreLayoutConfig {
  const effective = {
    direction: config.direction ?? 'TB',
    nodeSpacing: config.nodeSpacing ?? 50,
    edgeSpacing: config.edgeSpacing ?? 20,
    rankSpacing: config.rankSpacing ?? 50,
    marginX: config.marginX ?? 0,
    marginY: config.marginY ?? 0,
  };
  if (!(['TB', 'BT', 'LR', 'RL'] as const).includes(effective.direction)) {
    throw new TypeError('Dagre direction must be TB, BT, LR, or RL.');
  }
  for (const [name, value] of [
    ['nodeSpacing', effective.nodeSpacing],
    ['edgeSpacing', effective.edgeSpacing],
    ['rankSpacing', effective.rankSpacing],
    ['marginX', effective.marginX],
    ['marginY', effective.marginY],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Dagre ${name} must be a finite non-negative number.`);
    }
  }
  return Object.freeze(effective);
}
