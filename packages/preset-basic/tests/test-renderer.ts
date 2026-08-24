import type { InteractionProjection } from '@nodebraid/interaction-api';
import type { SessionSnapshot } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';

export class TestCanvasRenderer implements CanvasRenderer {
  disposed = false;

  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(_projection: InteractionProjection | null): void {}

  subscribeInput(_listener: RendererInputListener): () => void {
    return () => undefined;
  }

  hitTest(point: ScreenPoint): HitResult | null {
    return { type: 'canvas', worldPoint: point };
  }

  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}

  async dispose(): Promise<void> {
    this.disposed = true;
  }
}
