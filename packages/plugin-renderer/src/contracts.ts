import type { InteractionProjection } from '@cflow/interaction-api';
import type { HitResult, RendererInputListener, ScreenPoint } from '@cflow/renderer-api';

export interface InteractionProjectionBinding {
  update(projection: InteractionProjection | null): void;
  dispose(): void;
}

export interface RendererService {
  /** Interaction-facing seam; Document projection and Renderer disposal stay private to the Runtime Plugin. */
  bindInteractionProjection(): InteractionProjectionBinding;
  subscribeInput(listener: RendererInputListener): () => void;
  hitTest(point: ScreenPoint): HitResult | null;
  capturePointer(pointerId: number): void;
  releasePointer(pointerId: number): void;
  focus(): void;
}
