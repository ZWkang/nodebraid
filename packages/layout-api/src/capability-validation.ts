import type { LayoutCapabilities, LayoutInput } from './contracts';
import { LayoutError } from './layout-error';

export function assertLayoutCapabilities(
  providerId: string,
  capabilities: LayoutCapabilities,
  input: LayoutInput,
): void {
  if (input.mode === 'incremental' && !capabilities.incremental) {
    throwUnsupportedFeature(providerId, 'incremental');
  }
  if (input.nodes.some((node) => node.fixed) && !capabilities.fixedNodes) {
    throwUnsupportedFeature(providerId, 'fixedNodes');
  }
  if (input.edges.some((edge) => edge.sourceNodeId === edge.targetNodeId) && !capabilities.selfLoops) {
    throwUnsupportedFeature(providerId, 'selfLoops');
  }
}

function throwUnsupportedFeature(providerId: string, feature: string): never {
  throw new LayoutError(
    'UNSUPPORTED_FEATURE',
    `Layout Provider "${providerId}" does not support ${feature}.`,
    Object.freeze({ feature, providerId }),
  );
}
