import type { HitResult, RendererInputListener, ScreenPoint } from '@cflow/renderer-api';

export interface RendererService {
  /** Interaction-facing seam; Document projection and Renderer disposal stay private to the Runtime Plugin. */
  subscribeInput(listener: RendererInputListener): () => void;
  hitTest(point: ScreenPoint): HitResult | null;
  capturePointer(pointerId: number): void;
  releasePointer(pointerId: number): void;
  focus(): void;
}
