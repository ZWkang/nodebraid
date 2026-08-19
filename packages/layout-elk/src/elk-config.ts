import type { ElkLayoutAlgorithm, ElkLayoutConfig, ElkLayoutDirection } from './contracts';

export interface EffectiveElkLayoutConfig {
  readonly algorithm: ElkLayoutAlgorithm;
  readonly direction: ElkLayoutDirection;
  readonly nodeSpacing: number;
  readonly layerSpacing: number;
  readonly padding: number;
  readonly randomSeed: number;
}

export function resolveElkLayoutConfig(config: ElkLayoutConfig): EffectiveElkLayoutConfig {
  const effective = {
    algorithm: config.algorithm ?? 'layered',
    direction: config.direction ?? 'DOWN',
    nodeSpacing: config.nodeSpacing ?? 20,
    layerSpacing: config.layerSpacing ?? 50,
    padding: config.padding ?? 0,
    randomSeed: config.randomSeed ?? 1,
  };
  if (!(['layered', 'stress'] as const).includes(effective.algorithm)) {
    throw new TypeError('ELK algorithm must be layered or stress.');
  }
  if (!(['UP', 'DOWN', 'LEFT', 'RIGHT'] as const).includes(effective.direction)) {
    throw new TypeError('ELK direction must be UP, DOWN, LEFT, or RIGHT.');
  }
  for (const [name, value] of [
    ['nodeSpacing', effective.nodeSpacing],
    ['layerSpacing', effective.layerSpacing],
    ['padding', effective.padding],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`ELK ${name} must be a finite non-negative number.`);
    }
  }
  if (!Number.isSafeInteger(effective.randomSeed)) {
    throw new RangeError('ELK randomSeed must be a safe integer.');
  }
  return Object.freeze(effective);
}
