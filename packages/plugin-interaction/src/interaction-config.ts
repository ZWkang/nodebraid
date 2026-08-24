import type { EffectiveInteractionConfig, InteractionConfig } from './contracts';
import { InteractionError } from './interaction-error';

const configFields = new Set(['dragThreshold', 'wheelZoomSensitivity', 'minZoom', 'maxZoom', 'connection']);

export function resolveInteractionConfig(config: InteractionConfig | undefined): EffectiveInteractionConfig {
  if (config !== undefined) {
    if (config === null || typeof config !== 'object' || Array.isArray(config)) {
      throw new InteractionError('INVALID_CONFIG', 'Interaction config must be an object.');
    }
    for (const field of Object.keys(config)) {
      if (!configFields.has(field)) {
        throw new InteractionError('INVALID_CONFIG', `Unknown Interaction config field: ${field}.`);
      }
    }
  }

  const resolved = {
    dragThreshold: config?.dragThreshold ?? 4,
    wheelZoomSensitivity: config?.wheelZoomSensitivity ?? 0.002,
    minZoom: config?.minZoom ?? 0.1,
    maxZoom: config?.maxZoom ?? 8,
    connection: config?.connection,
  };
  if (!Number.isFinite(resolved.dragThreshold) || resolved.dragThreshold < 0) {
    throw new InteractionError('INVALID_CONFIG', 'Interaction dragThreshold must be a finite non-negative number.');
  }
  if (!Number.isFinite(resolved.wheelZoomSensitivity) || resolved.wheelZoomSensitivity <= 0) {
    throw new InteractionError('INVALID_CONFIG', 'Interaction wheelZoomSensitivity must be a finite positive number.');
  }
  if (!Number.isFinite(resolved.minZoom) || resolved.minZoom <= 0) {
    throw new InteractionError('INVALID_CONFIG', 'Interaction minZoom must be a finite positive number.');
  }
  if (!Number.isFinite(resolved.maxZoom) || resolved.maxZoom <= 0) {
    throw new InteractionError('INVALID_CONFIG', 'Interaction maxZoom must be a finite positive number.');
  }
  if (resolved.minZoom > resolved.maxZoom) {
    throw new InteractionError('INVALID_CONFIG', 'Interaction minZoom must not exceed maxZoom.');
  }
  if (resolved.connection !== undefined) {
    if (!isRecord(resolved.connection)) {
      throw new InteractionError('INVALID_CONFIG', 'Interaction connection config must be an object.');
    }
    for (const field of Reflect.ownKeys(resolved.connection)) {
      if (field !== 'materializeEdge') {
        throw new InteractionError('INVALID_CONFIG', 'Interaction connection config contains an unknown field.');
      }
    }
    if (typeof resolved.connection.materializeEdge !== 'function') {
      throw new InteractionError('INVALID_CONFIG', 'Interaction connection materializeEdge must be a function.');
    }
    resolved.connection = Object.freeze({ materializeEdge: resolved.connection.materializeEdge });
  }
  return Object.freeze(resolved);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
