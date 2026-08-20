import type { InteractionProjection } from '@cflow/interaction-api';
import type { CanvasCommit, CanvasView, EdgeId, NodeId, Point } from '@cflow/kernel';
import type { SessionSnapshot } from '@cflow/session-api';

export interface ScreenPoint {
  /** Logical screen coordinates, not device or backing-store pixels. */
  readonly x: number;
  readonly y: number;
}

export interface InputModifiers {
  readonly alt: boolean;
  readonly control: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
}

export type PointerButton = 'primary' | 'auxiliary' | 'secondary' | 'back' | 'forward';

export type PointerType = 'mouse' | 'pen' | 'touch' | 'unknown';

export interface PointerInput {
  readonly type: 'pointer.down' | 'pointer.move' | 'pointer.up' | 'pointer.cancel';
  readonly pointerId: number;
  readonly pointerType: PointerType;
  /** Both points describe the same input under the Renderer’s accepted Viewport. */
  readonly screenPoint: ScreenPoint;
  readonly worldPoint: Point;
  readonly button: PointerButton | null;
  readonly pressedButtons: readonly PointerButton[];
  readonly modifiers: InputModifiers;
}

export interface WheelInput {
  readonly type: 'wheel';
  readonly screenPoint: ScreenPoint;
  readonly worldPoint: Point;
  /** Provider-normalized logical-screen-pixel deltas. */
  readonly deltaX: number;
  readonly deltaY: number;
  readonly modifiers: InputModifiers;
}

export interface KeyboardInput {
  readonly type: 'key.down' | 'key.up';
  readonly key: string;
  readonly code: string;
  readonly repeat: boolean;
  readonly modifiers: InputModifiers;
}

export interface FocusInput {
  readonly type: 'focus.gained' | 'focus.lost';
}

export type RendererInput = PointerInput | WheelInput | KeyboardInput | FocusInput;

export type RendererInputListener = (input: RendererInput) => void;

export type HitResult =
  | { readonly type: 'canvas'; readonly worldPoint: Point }
  | { readonly type: 'node'; readonly nodeId: NodeId; readonly worldPoint: Point }
  | { readonly type: 'edge'; readonly edgeId: EdgeId; readonly worldPoint: Point }
  | { readonly type: 'port'; readonly nodeId: NodeId; readonly portId: string; readonly worldPoint: Point };

export type RendererDocumentUpdate =
  { readonly type: 'reset'; readonly view: CanvasView } | { readonly type: 'commit'; readonly commit: CanvasCommit };

/** Provider seam: semantic projection and input facts without Document or Session write authority. */
export interface CanvasRenderer {
  /** Reset establishes a Baseline; Commit must be contiguous with the accepted Baseline. */
  updateDocument(update: RendererDocumentUpdate): void;
  updateSession(snapshot: SessionSnapshot): void;
  updateInteraction(projection: InteractionProjection | null): void;
  subscribeInput(listener: RendererInputListener): () => void;
  hitTest(point: ScreenPoint): HitResult | null;
  capturePointer(pointerId: number): void;
  releasePointer(pointerId: number): void;
  focus(): void;
  /** Terminal, asynchronous, and idempotent for one target-bound Renderer Instance. */
  dispose(): Promise<void>;
}

/** Provider-owned construction seam; Config may contain the concrete backend Target. */
export type RendererFactory<Config> = (config: Readonly<Config>) => CanvasRenderer | PromiseLike<CanvasRenderer>;
