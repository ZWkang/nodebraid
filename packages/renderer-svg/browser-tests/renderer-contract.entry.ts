// Public-seam browser scenarios for the complete SVG Renderer contract.
import { createCanvasKernel, edgeId, nodeId } from '@cflow/kernel';
import type { DiagnosticFault } from '@cflow/diagnostics';
import { interactionPlugin } from '@cflow/plugin-interaction';
import { commandPlugin } from '@cflow/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@cflow/plugin-kernel';
import { createRendererPlugin, rendererService, type RendererService } from '@cflow/plugin-renderer';
import { sessionPlugin, sessionService, type SessionService } from '@cflow/plugin-session';
import type { CanvasRenderer, RendererInput } from '@cflow/renderer-api';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { createSvgRenderer, type SvgRendererConfig } from '../src';

interface FirstNodeResult {
  readonly callerContentPreserved: boolean;
  readonly targetChildOrder: readonly string[];
  readonly projectionClass: string | null;
  readonly layerClasses: readonly (string | null)[];
  readonly node: Readonly<{
    tagName: string;
    id: string | null;
    x: string | null;
    y: string | null;
    width: string | null;
    height: string | null;
  }>;
}

interface FirstInteractionProjectionResult {
  readonly previewPosition: Readonly<{ x: string | null; y: string | null }>;
  readonly documentPosition: Readonly<{ x: number; y: number }>;
}

interface InteractionProjectionClearResult {
  readonly previewX: string | null;
  readonly restoredX: string | null;
  readonly preservedNodeIdentity: boolean;
}

interface InteractionProjectionEdgeResult {
  readonly sourceX: string | null;
  readonly sourceY: string | null;
  readonly targetX: string | null;
  readonly targetY: string | null;
}

interface ViewportInteractionProjectionResult {
  readonly previewTransform: string | null;
  readonly sessionViewport: Readonly<{ x: number; y: number; zoom: number }>;
}

interface InteractionProjectionHitResult {
  readonly hit: unknown;
}

interface InteractionProjectionIsolationResult {
  readonly nodeX: string | null;
  readonly hit: unknown;
}

interface RuntimeInteractionProjectionResult {
  readonly previewX: string | null;
  readonly restoredX: string | null;
}

interface SelectionInteractionResult {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
}

interface FirstEdgeResult {
  readonly layerClasses: readonly (string | null)[];
  readonly edgeIds: readonly (string | null)[];
  readonly nodeIds: readonly (string | null)[];
  readonly edge: Readonly<{
    tagName: string;
    id: string | null;
    x1: string | null;
    y1: string | null;
    x2: string | null;
    y2: string | null;
  }>;
}

interface GeometryErrorResult {
  readonly error: Readonly<{
    name: string;
    domain: string;
    code: string;
    details: unknown;
  }> | null;
  readonly projectionUnchanged: boolean;
}

interface FirstCommitResult {
  readonly preservedNodeIdentity: boolean;
  readonly node: Readonly<{
    x: string | null;
    y: string | null;
    width: string | null;
    height: string | null;
  }>;
}

interface AddRemoveCommitResult {
  readonly nodeIds: readonly (string | null)[];
  readonly edgeIds: readonly (string | null)[];
  readonly preservedNodeIdentity: boolean;
  readonly preservedEdgeIdentity: boolean;
}

interface EdgeReplaceResult {
  readonly preservedEdgeIdentity: boolean;
  readonly x2: string | null;
  readonly y2: string | null;
}

interface ContinuityResult {
  readonly withoutBaseline: GeometryErrorResult['error'];
  readonly duplicate: GeometryErrorResult['error'];
  readonly gap: GeometryErrorResult['error'];
  readonly resetReplacedNodeIdentity: boolean;
  readonly resetX: string | null;
}

interface DerivedEdgeResult {
  readonly preservedEdgeIdentity: boolean;
  readonly x1: string | null;
  readonly y1: string | null;
}

interface EvidenceErrorResult {
  readonly error: GeometryErrorResult['error'];
  readonly projectionUnchanged: boolean;
  readonly nodeX: string | null;
}

interface ChangeSetMismatchResult extends EvidenceErrorResult {
  readonly recoveredX: string | null;
}

interface SnapshotErrorResult extends EvidenceErrorResult {
  readonly recoveredNodeIds: readonly (string | null)[];
}

interface BaselineIsolationResult {
  readonly mutableShellWasIsolated: boolean;
  readonly dataOnlyPreservedIdentity: boolean;
  readonly dataOnlyPreservedDom: boolean;
  readonly nextCommitX: string | null;
}

interface SnapshotGraphResult {
  readonly duplicate: GeometryErrorResult['error'];
  readonly missingEndpoint: GeometryErrorResult['error'];
  readonly parentCycle: GeometryErrorResult['error'];
  readonly projectionUnchanged: boolean;
  readonly recoveredNodeIds: readonly (string | null)[];
}

interface RollbackSuccessResult {
  readonly sameErrorIdentity: boolean;
  readonly errorName: string | null;
  readonly errorMessage: string | null;
  readonly rollbackX: string | null;
  readonly recoveredX: string | null;
}

interface RollbackFailureResult {
  readonly aggregateName: string | null;
  readonly aggregateMessage: string | null;
  readonly aggregateErrorCount: number;
  readonly includesPrimaryError: boolean;
  readonly includesRollbackYError: boolean;
  readonly includesRollbackXError: boolean;
  readonly blockedCommit: GeometryErrorResult['error'];
  readonly blockedSession: GeometryErrorResult['error'];
  readonly blockedInput: GeometryErrorResult['error'];
  readonly inputCount: number;
  readonly resetX: string | null;
}

interface LayerRollbackResult {
  readonly sameErrorIdentity: boolean;
  readonly rollbackNodeIds: readonly (string | null)[];
  readonly restoredBIdentity: boolean;
  readonly restoredCIdentity: boolean;
  readonly recoveredNodeIds: readonly (string | null)[];
}

interface SessionProjectionResult {
  readonly transform: string | null;
  readonly selected: string | null;
}

interface SessionErrorResult {
  readonly error: GeometryErrorResult['error'];
  readonly transform: string | null;
}

interface SessionValidationResult {
  readonly dangling: GeometryErrorResult['error'];
  readonly nonCanonical: GeometryErrorResult['error'];
  readonly duplicate: GeometryErrorResult['error'];
  readonly invalidZoom: GeometryErrorResult['error'];
  readonly transform: string | null;
  readonly selectedA: string | null;
  readonly selectedB: string | null;
}

interface ResizeProjectionResult {
  readonly before: string | null;
  readonly after: string | null;
}

interface SessionCoherenceResult {
  readonly error: GeometryErrorResult['error'];
  readonly nodeRemainedAfterRejection: boolean;
  readonly nodeRemovedAfterSessionUpdate: boolean;
}

interface TargetUnavailableResult {
  readonly detached: GeometryErrorResult['error'];
  readonly zeroSize: GeometryErrorResult['error'];
  readonly singular: GeometryErrorResult['error'];
  readonly selectedAfterFailures: string | null;
  readonly recoveredTransform: string | null;
}

interface HitTestResult {
  readonly node: unknown;
  readonly edge: unknown;
  readonly canvas: unknown;
  readonly outside: unknown;
}

interface HitToleranceResult {
  readonly defaultNear: unknown;
  readonly configuredNear: unknown;
  readonly reverseOrder: unknown;
  readonly invalidPoint: GeometryErrorResult['error'];
}

interface WheelKeyboardPolicyResult {
  readonly inputs: readonly RendererInput[];
  readonly wheelDispatchResults: readonly boolean[];
  readonly keyboardDispatchResults: readonly boolean[];
  readonly contextMenuDispatchResult: boolean;
  readonly bubbled: Readonly<{ wheel: number; keyboard: number; contextMenu: number }>;
  readonly touchAction: string;
}

interface InputOrderResult {
  readonly order: readonly string[];
}

interface FocusResult {
  readonly addedTabIndex: string | null;
  readonly active: boolean;
  readonly scrollY: number;
  readonly restoredTabIndex: string | null;
}

interface PointerCaptureResult {
  readonly unknownBefore: GeometryErrorResult['error'];
  readonly sawDown: boolean;
  readonly sawOutsideMove: boolean;
  readonly sawUp: boolean;
  readonly capturedDuringDown: boolean;
  readonly capturedDuringUp: boolean;
  readonly capturedAfterUp: boolean;
  readonly afterUpError: GeometryErrorResult['error'];
}

interface PointerCleanupFailureResult {
  readonly nativeError: GeometryErrorResult['error'];
  readonly capturedAfterFailedUp: boolean;
  readonly captureAfterFailedUp: GeometryErrorResult['error'];
  readonly releaseAfterFailedUp: GeometryErrorResult['error'];
  readonly recapturedOnNextDown: boolean;
  readonly capturedAfterNextUp: boolean;
  readonly captureAfterNextUp: GeometryErrorResult['error'];
}

interface PointerDoubleFailureResult {
  readonly aggregateName: string | null;
  readonly aggregateMessage: string | null;
  readonly aggregateErrorCount: number;
  readonly handlingError: GeometryErrorResult['error'];
  readonly includesCleanupError: boolean;
  readonly captureAfterFailedUp: GeometryErrorResult['error'];
  readonly releaseAfterFailedUp: GeometryErrorResult['error'];
  readonly reservationReusable: boolean;
}

interface InputFaultResult {
  readonly order: readonly string[];
  readonly errorEventCount: number;
  readonly aggregateName: string | null;
  readonly aggregateErrorCount: number;
  readonly includesFirstError: boolean;
  readonly includesSecondError: boolean;
}

interface DisposeLifecycleResult {
  readonly activeDuplicate: GeometryErrorResult['error'];
  readonly cleanupWindowDuplicate: GeometryErrorResult['error'];
  readonly sameDisposePromise: boolean;
  readonly staleUpdate: GeometryErrorResult['error'];
  readonly staleFocus: GeometryErrorResult['error'];
  readonly staleSubscribe: GeometryErrorResult['error'];
  readonly inputsAfterDisposeCall: number;
  readonly callerContentPreserved: boolean;
  readonly projectionRemoved: boolean;
  readonly tabIndexPreserved: string | null;
  readonly targetReusable: boolean;
}

interface DisposeFailureResult {
  readonly aggregateName: string | null;
  readonly aggregateMessage: string | null;
  readonly aggregateErrorCount: number;
  readonly includesListenerError: boolean;
  readonly includesProjectionError: boolean;
  readonly tabIndexRestored: boolean;
  readonly projectionRetained: boolean;
  readonly reservationError: GeometryErrorResult['error'];
}

interface RuntimeIntegrationResult {
  readonly initialNodeCount: number;
  readonly node: Readonly<{
    x: string | null;
    selected: string | null;
  }>;
  readonly transform: string | null;
  readonly hit: unknown;
  readonly activeAfterFocus: boolean;
  readonly forwardedInput: unknown;
  readonly resyncedNodeIds: readonly (string | null)[];
  readonly syncFaultCodes: readonly unknown[];
  readonly projectionRemoved: boolean;
  readonly staleService: GeometryErrorResult['error'];
}

interface RuntimeCaptureResult {
  readonly capturedThroughService: boolean;
  readonly sawOutsideMove: boolean;
  readonly capturedDuringUp: boolean;
  readonly releasedThroughService: boolean;
  readonly capturedAfterUp: boolean;
}

interface TargetAtomicCommitResult {
  readonly error: GeometryErrorResult['error'];
  readonly xAfterRejection: string | null;
  readonly recoveredX: string | null;
}

interface OperationRefreshResult {
  readonly before: string | null;
  readonly afterHitTest: string | null;
  readonly afterInput: string | null;
}

interface OwnerRealmResult {
  readonly nodeId: string | null;
  readonly projectionClass: string | null;
}

interface UnknownConfigResult {
  readonly root: GeometryErrorResult['error'];
  readonly input: GeometryErrorResult['error'];
  readonly policy: GeometryErrorResult['error'];
  readonly targetUnchanged: boolean;
}

interface MalformedUpdateResult {
  readonly nullUpdate: GeometryErrorResult['error'];
  readonly invalidQuery: GeometryErrorResult['error'];
  readonly nullCommit: GeometryErrorResult['error'];
  readonly projectionUnchanged: boolean;
}

interface MalformedCommitAttemptResult {
  readonly error: GeometryErrorResult['error'];
  readonly projectionUnchanged: boolean;
  readonly recoveredX: string | null;
}

interface MalformedChangeEvidenceResult {
  readonly nodePosition: MalformedCommitAttemptResult;
  readonly edgeSource: MalformedCommitAttemptResult;
  readonly missingNodeData: MalformedCommitAttemptResult;
  readonly missingEdgeData: MalformedCommitAttemptResult;
  readonly emptyChanges: MalformedCommitAttemptResult;
}

interface CommitSessionRollbackResult {
  readonly sameErrorIdentity: boolean;
  readonly rollbackX: string | null;
  readonly rollbackTransform: string | null;
  readonly recoveredX: string | null;
  readonly recoveredTransform: string | null;
}

interface ResetAtomicityResult {
  readonly layerSameErrorIdentity: boolean;
  readonly layerNodeIdentityRestored: boolean;
  readonly layerEdgeIdentityRestored: boolean;
  readonly layerRollbackX: string | null;
  readonly layerRecoveredX: string | null;
  readonly sessionSameErrorIdentity: boolean;
  readonly sessionNodeIdentityRestored: boolean;
  readonly sessionRollbackX: string | null;
  readonly sessionRollbackTransform: string | null;
  readonly sessionRecoveredX: string | null;
  readonly sessionRecoveredTransform: string | null;
}

interface ResizeObserverErrorResult {
  readonly sameErrorIdentity: boolean;
  readonly rollbackTransform: string | null;
  readonly successfulResizeTransform: string | null;
  readonly recoveredTransform: string | null;
}

interface ResizeObserverRollbackFailureResult {
  readonly aggregateName: string | null;
  readonly aggregateMessage: string | null;
  readonly aggregateErrorCount: number;
  readonly includesPrimaryError: boolean;
  readonly includesRollbackError: boolean;
  readonly blockedSession: GeometryErrorResult['error'];
  readonly recoveredTransform: string | null;
}

interface ResizeObserverMultipleErrorsResult {
  readonly aggregateName: string | null;
  readonly aggregateMessage: string | null;
  readonly aggregateErrorCount: number;
  readonly includesFirstError: boolean;
  readonly includesSecondError: boolean;
  readonly recoveredTransform: string | null;
}

declare global {
  var __cflowRendererSvgTicket01: () => Promise<FirstNodeResult>;
  var __cflowRendererSvgInteractionProjectionFirstNode: () => Promise<FirstInteractionProjectionResult>;
  var __cflowRendererSvgInteractionProjectionClear: () => Promise<InteractionProjectionClearResult>;
  var __cflowRendererSvgInteractionProjectionEdge: () => Promise<InteractionProjectionEdgeResult>;
  var __cflowRendererSvgViewportInteractionProjection: () => Promise<ViewportInteractionProjectionResult>;
  var __cflowRendererSvgInteractionProjectionHit: () => Promise<InteractionProjectionHitResult>;
  var __cflowRendererSvgInteractionProjectionIsolation: () => Promise<InteractionProjectionIsolationResult>;
  var __cflowRendererSvgInteractionProjectionBaselineMismatch: () => Promise<EvidenceErrorResult>;
  var __cflowRendererSvgInteractionProjectionDuplicateNode: () => Promise<EvidenceErrorResult>;
  var __cflowRendererSvgInteractionProjectionInvalidPosition: () => Promise<EvidenceErrorResult>;
  var __cflowRendererSvgInteractionProjectionOrder: () => Promise<EvidenceErrorResult>;
  var __cflowRendererSvgInteractionProjectionEmpty: () => Promise<GeometryErrorResult>;
  var __cflowRendererSvgInteractionProjectionUnknownType: () => Promise<GeometryErrorResult>;
  var __cflowRendererSvgInteractionProjectionInvalidViewport: () => Promise<GeometryErrorResult>;
  var __cflowRendererSvgRuntimeInteractionProjection: () => Promise<RuntimeInteractionProjectionResult>;
  var __cflowRendererSvgSetupSelectionInteraction: () => Promise<void>;
  var __cflowRendererSvgReadSelectionInteraction: () => SelectionInteractionResult;
  var __cflowRendererSvgTeardownSelectionInteraction: () => Promise<void>;
  var __cflowRendererSvgSetupInteractionProjectionInput: () => Promise<void>;
  var __cflowRendererSvgReadInteractionProjectionInput: () => RendererInput | undefined;
  var __cflowRendererSvgTeardownInteractionProjectionInput: () => Promise<void>;
  var __cflowRendererSvgTicket02FirstEdge: () => Promise<FirstEdgeResult>;
  var __cflowRendererSvgTicket02PortError: () => Promise<GeometryErrorResult>;
  var __cflowRendererSvgTicket02SelfLoopError: () => Promise<GeometryErrorResult>;
  var __cflowRendererSvgTicket02MissingSizeError: () => Promise<GeometryErrorResult>;
  var __cflowRendererSvgTicket03FirstCommit: () => Promise<FirstCommitResult>;
  var __cflowRendererSvgTicket03AddRemove: () => Promise<AddRemoveCommitResult>;
  var __cflowRendererSvgTicket03EdgeReplace: () => Promise<EdgeReplaceResult>;
  var __cflowRendererSvgTicket03Continuity: () => Promise<ContinuityResult>;
  var __cflowRendererSvgTicket04DerivedEdge: () => Promise<DerivedEdgeResult>;
  var __cflowRendererSvgTicket04BeforeMismatch: () => Promise<EvidenceErrorResult>;
  var __cflowRendererSvgTicket04ChangeSetMismatch: () => Promise<ChangeSetMismatchResult>;
  var __cflowRendererSvgTicket04SnapshotOrder: () => Promise<SnapshotErrorResult>;
  var __cflowRendererSvgTicket04BaselineIsolation: () => Promise<BaselineIsolationResult>;
  var __cflowRendererSvgTicket04SnapshotGraph: () => Promise<SnapshotGraphResult>;
  var __cflowRendererSvgTicket05RollbackSuccess: () => Promise<RollbackSuccessResult>;
  var __cflowRendererSvgTicket05RollbackFailure: () => Promise<RollbackFailureResult>;
  var __cflowRendererSvgTicket05LayerRollback: () => Promise<LayerRollbackResult>;
  var __cflowRendererSvgTicket06SessionProjection: () => Promise<SessionProjectionResult>;
  var __cflowRendererSvgTicket06BeforeBaseline: () => Promise<SessionErrorResult>;
  var __cflowRendererSvgTicket06SessionValidation: () => Promise<SessionValidationResult>;
  var __cflowRendererSvgTicket06ResizeProjection: () => Promise<ResizeProjectionResult>;
  var __cflowRendererSvgTicket06SessionCoherence: () => Promise<SessionCoherenceResult>;
  var __cflowRendererSvgTicket06TargetUnavailable: () => Promise<TargetUnavailableResult>;
  var __cflowRendererSvgTicket07FirstHits: () => Promise<HitTestResult>;
  var __cflowRendererSvgTicket07Tolerance: () => Promise<HitToleranceResult>;
  var __cflowRendererSvgTicket08SetupPointer: () => Promise<Readonly<{ x: number; y: number }>>;
  var __cflowRendererSvgTicket08ReadPointer: () => readonly RendererInput[];
  var __cflowRendererSvgTicket08TeardownPointer: () => Promise<void>;
  var __cflowRendererSvgTicket08WheelKeyboardPolicy: () => Promise<WheelKeyboardPolicyResult>;
  var __cflowRendererSvgTicket09InputOrder: () => Promise<InputOrderResult>;
  var __cflowRendererSvgTicket09Focus: () => Promise<FocusResult>;
  var __cflowRendererSvgTicket09SetupCapture: () => Promise<void>;
  var __cflowRendererSvgTicket09ReadCapture: () => PointerCaptureResult;
  var __cflowRendererSvgTicket09TeardownCapture: () => Promise<void>;
  var __cflowRendererSvgReviewSetupPointerCleanup: (failNativeRelease?: boolean) => Promise<void>;
  var __cflowRendererSvgReviewMakePointerTargetSingular: () => void;
  var __cflowRendererSvgReviewFinishFaultedPointerUp: () => void;
  var __cflowRendererSvgReviewReadPointerCleanup: () => PointerCleanupFailureResult;
  var __cflowRendererSvgReviewFinishPointerDoubleFailure: () => Promise<PointerDoubleFailureResult>;
  var __cflowRendererSvgReviewTeardownPointerCleanup: () => Promise<void>;
  var __cflowRendererSvgTicket09InputFaults: () => Promise<InputFaultResult>;
  var __cflowRendererSvgTicket10DisposeLifecycle: () => Promise<DisposeLifecycleResult>;
  var __cflowRendererSvgTicket10DisposeFailure: () => Promise<DisposeFailureResult>;
  var __cflowRendererSvgTicket11RuntimeIntegration: () => Promise<RuntimeIntegrationResult>;
  var __cflowRendererSvgTicket11SetupRuntimeCapture: () => Promise<void>;
  var __cflowRendererSvgTicket11ReadRuntimeCapture: () => RuntimeCaptureResult;
  var __cflowRendererSvgTicket11TeardownRuntimeCapture: () => Promise<void>;
  var __cflowRendererSvgReviewTargetAtomicCommit: () => Promise<TargetAtomicCommitResult>;
  var __cflowRendererSvgReviewOperationRefresh: () => Promise<OperationRefreshResult>;
  var __cflowRendererSvgReviewOwnerRealm: () => Promise<OwnerRealmResult>;
  var __cflowRendererSvgReviewUnknownConfig: () => Promise<UnknownConfigResult>;
  var __cflowRendererSvgReviewMalformedUpdates: () => Promise<MalformedUpdateResult>;
  var __cflowRendererSvgReviewMalformedChangeEvidence: () => Promise<MalformedChangeEvidenceResult>;
  var __cflowRendererSvgReviewCommitSessionRollback: () => Promise<CommitSessionRollbackResult>;
  var __cflowRendererSvgReviewResetAtomicity: () => Promise<ResetAtomicityResult>;
  var __cflowRendererSvgReviewResizeObserverError: () => Promise<ResizeObserverErrorResult>;
  var __cflowRendererSvgReviewResizeObserverRollbackFailure: () => Promise<ResizeObserverRollbackFailureResult>;
  var __cflowRendererSvgReviewResizeObserverMultipleErrors: () => Promise<ResizeObserverMultipleErrorsResult>;
}

globalThis.__cflowRendererSvgTicket01 = async (): Promise<FirstNodeResult> => {
  const target = document.querySelector<SVGSVGElement>('#target');
  if (!target) throw new Error('Expected the browser fixture to contain an SVG Target.');

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });

  const firstNodeId = nodeId('node-a');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: firstNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });

  const projection = target.querySelector<SVGGElement>(':scope > .cflow-renderer-svg');
  const node = projection?.querySelector<SVGRectElement>('[data-cflow-node-id="node-a"]');
  if (!projection || !node) throw new Error('Expected the SVG Projection to contain the first Node.');

  return {
    callerContentPreserved: target.querySelector(':scope > defs[data-caller-owned]') !== null,
    targetChildOrder: Array.from(target.children, (child) => child.tagName),
    projectionClass: projection.getAttribute('class'),
    layerClasses: Array.from(projection.children, (child) => child.getAttribute('class')),
    node: {
      tagName: node.tagName,
      id: node.getAttribute('data-cflow-node-id'),
      x: node.getAttribute('x'),
      y: node.getAttribute('y'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
    },
  };
};

globalThis.__cflowRendererSvgInteractionProjectionFirstNode = async (): Promise<FirstInteractionProjectionResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const previewedNodeId = nodeId('interaction-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: previewedNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [previewedNodeId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });

  renderer.updateInteraction({
    type: 'node-drag',
    nodes: [
      {
        nodeId: previewedNodeId,
        basePosition: { x: 10, y: 20 },
        position: { x: 80, y: 90 },
      },
    ],
  });

  const node = target.querySelector<SVGRectElement>('[data-cflow-node-id="interaction-node"]');
  const documentNode = kernel.read().query.getNode(previewedNodeId);
  if (!node || !documentNode) throw new Error('Expected the Interaction Projection Node and Document Node.');
  const result: FirstInteractionProjectionResult = {
    previewPosition: { x: node.getAttribute('x'), y: node.getAttribute('y') },
    documentPosition: documentNode.position,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionClear = async (): Promise<InteractionProjectionClearResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const previewedNodeId = nodeId('clear-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: previewedNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [previewedNodeId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const nodeBeforePreview = target.querySelector<SVGRectElement>('[data-cflow-node-id="clear-node"]');
  if (!nodeBeforePreview) throw new Error('Expected the committed Node before Interaction Projection.');

  renderer.updateInteraction({
    type: 'node-drag',
    nodes: [
      {
        nodeId: previewedNodeId,
        basePosition: { x: 10, y: 20 },
        position: { x: 80, y: 90 },
      },
    ],
  });
  const previewX = nodeBeforePreview.getAttribute('x');
  renderer.updateInteraction(null);

  const nodeAfterClear = target.querySelector<SVGRectElement>('[data-cflow-node-id="clear-node"]');
  const result: InteractionProjectionClearResult = {
    previewX,
    restoredX: nodeAfterClear?.getAttribute('x') ?? null,
    preservedNodeIdentity: nodeBeforePreview === nodeAfterClear,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionEdge = async (): Promise<InteractionProjectionEdgeResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const sourceId = nodeId('interaction-source');
  const targetId = nodeId('interaction-target');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'task',
      position: { x: 200, y: 100 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('interaction-edge'),
      type: 'flow',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [sourceId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  renderer.updateInteraction({
    type: 'node-drag',
    nodes: [{ nodeId: sourceId, basePosition: { x: 10, y: 20 }, position: { x: 80, y: 90 } }],
  });

  const edge = target.querySelector<SVGLineElement>('[data-cflow-edge-id="interaction-edge"]');
  if (!edge) throw new Error('Expected the Interaction Projection incident Edge.');
  const result: InteractionProjectionEdgeResult = {
    sourceX: edge.getAttribute('x1'),
    sourceY: edge.getAttribute('y1'),
    targetX: edge.getAttribute('x2'),
    targetY: edge.getAttribute('y2'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgViewportInteractionProjection = async (): Promise<ViewportInteractionProjectionResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const session = {
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  } as const;
  renderer.updateSession(session);
  renderer.updateInteraction({
    type: 'viewport-pan',
    baseViewport: session.viewport,
    viewport: { x: 40, y: 50, zoom: 2 },
  });

  const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
  if (!projection) throw new Error('Expected the Viewport Interaction Projection root.');
  const result: ViewportInteractionProjectionResult = {
    previewTransform: projection.getAttribute('transform'),
    sessionViewport: session.viewport,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionHit = async (): Promise<InteractionProjectionHitResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const previewedNodeId = nodeId('interaction-hit-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: previewedNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [previewedNodeId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  renderer.updateInteraction({
    type: 'node-drag',
    nodes: [
      {
        nodeId: previewedNodeId,
        basePosition: { x: 10, y: 20 },
        position: { x: 80, y: 90 },
      },
    ],
  });
  const result: InteractionProjectionHitResult = { hit: renderer.hitTest({ x: 100, y: 100 }) };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionIsolation =
  async (): Promise<InteractionProjectionIsolationResult> => {
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    target.setAttribute('width', '400');
    target.setAttribute('height', '300');
    document.body.append(target);

    const renderer = createSvgRenderer({ target });
    const kernel = createCanvasKernel();
    const previewedNodeId = nodeId('interaction-isolation-node');
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: previewedNodeId,
        type: 'task',
        position: { x: 10, y: 20 },
        size: { width: 80, height: 40 },
        data: null,
      });
    });
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    renderer.updateSession({
      selection: { nodeIds: [previewedNodeId], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    const projection = {
      type: 'node-drag',
      nodes: [
        {
          nodeId: previewedNodeId,
          basePosition: { x: 10, y: 20 },
          position: { x: 80, y: 90 },
        },
      ],
    } as const;
    renderer.updateInteraction(projection);
    (projection.nodes[0].position as { x: number }).x = 200;

    const node = target.querySelector<SVGRectElement>('[data-cflow-node-id="interaction-isolation-node"]');
    const result: InteractionProjectionIsolationResult = {
      nodeX: node?.getAttribute('x') ?? null,
      hit: renderer.hitTest({ x: 100, y: 100 }),
    };
    await renderer.dispose();
    target.remove();
    return result;
  };

globalThis.__cflowRendererSvgInteractionProjectionBaselineMismatch = async (): Promise<EvidenceErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const previewedNodeId = nodeId('interaction-baseline-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: previewedNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [previewedNodeId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const node = target.querySelector<SVGRectElement>('[data-cflow-node-id="interaction-baseline-node"]');
  if (!node) throw new Error('Expected the Interaction Projection baseline Node.');
  const beforeX = node.getAttribute('x');
  const error = captureRendererError(() =>
    renderer.updateInteraction({
      type: 'node-drag',
      nodes: [
        {
          nodeId: previewedNodeId,
          basePosition: { x: 11, y: 20 },
          position: { x: 80, y: 90 },
        },
      ],
    }),
  );
  const result: EvidenceErrorResult = {
    error,
    projectionUnchanged: node.getAttribute('x') === beforeX,
    nodeX: node.getAttribute('x'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionDuplicateNode = async (): Promise<EvidenceErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const previewedNodeId = nodeId('interaction-duplicate-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: previewedNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [previewedNodeId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const node = target.querySelector<SVGRectElement>('[data-cflow-node-id="interaction-duplicate-node"]');
  if (!node) throw new Error('Expected the duplicate Interaction Projection Node.');
  const beforeX = node.getAttribute('x');
  const error = captureRendererError(() =>
    renderer.updateInteraction({
      type: 'node-drag',
      nodes: [
        {
          nodeId: previewedNodeId,
          basePosition: { x: 10, y: 20 },
          position: { x: 80, y: 90 },
        },
        {
          nodeId: previewedNodeId,
          basePosition: { x: 10, y: 20 },
          position: { x: 100, y: 110 },
        },
      ],
    }),
  );
  const result: EvidenceErrorResult = {
    error,
    projectionUnchanged: node.getAttribute('x') === beforeX,
    nodeX: node.getAttribute('x'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionInvalidPosition = async (): Promise<EvidenceErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const previewedNodeId = nodeId('interaction-invalid-position');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: previewedNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [previewedNodeId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const node = target.querySelector<SVGRectElement>('[data-cflow-node-id="interaction-invalid-position"]');
  if (!node) throw new Error('Expected the invalid-position Interaction Projection Node.');
  const beforeX = node.getAttribute('x');
  const error = captureRendererError(() =>
    renderer.updateInteraction({
      type: 'node-drag',
      nodes: [
        {
          nodeId: previewedNodeId,
          basePosition: { x: 10, y: 20 },
          position: { x: Number.POSITIVE_INFINITY, y: 90 },
        },
      ],
    }),
  );
  const result: EvidenceErrorResult = {
    error,
    projectionUnchanged: node.getAttribute('x') === beforeX,
    nodeX: node.getAttribute('x'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionOrder = async (): Promise<EvidenceErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const firstId = nodeId('interaction-order-a');
  const secondId = nodeId('interaction-order-b');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: firstId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: secondId,
      type: 'task',
      position: { x: 200, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [firstId, secondId], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const firstNode = target.querySelector<SVGRectElement>('[data-cflow-node-id="interaction-order-a"]');
  if (!firstNode) throw new Error('Expected the ordered Interaction Projection Node.');
  const beforeX = firstNode.getAttribute('x');
  const error = captureRendererError(() =>
    renderer.updateInteraction({
      type: 'node-drag',
      nodes: [
        {
          nodeId: secondId,
          basePosition: { x: 200, y: 20 },
          position: { x: 220, y: 40 },
        },
        {
          nodeId: firstId,
          basePosition: { x: 10, y: 20 },
          position: { x: 30, y: 40 },
        },
      ],
    }),
  );
  const result: EvidenceErrorResult = {
    error,
    projectionUnchanged: firstNode.getAttribute('x') === beforeX,
    nodeX: firstNode.getAttribute('x'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionEmpty = async (): Promise<GeometryErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
  const beforeTransform = projection?.getAttribute('transform') ?? null;
  const error = captureRendererError(() => renderer.updateInteraction({ type: 'node-drag', nodes: [] }));
  const result: GeometryErrorResult = {
    error,
    projectionUnchanged: projection?.getAttribute('transform') === beforeTransform,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionUnknownType = async (): Promise<GeometryErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
  const beforeTransform = projection?.getAttribute('transform') ?? null;
  const error = captureRendererError(() => renderer.updateInteraction({ type: 'unknown-interaction' } as never));
  const result: GeometryErrorResult = {
    error,
    projectionUnchanged: projection?.getAttribute('transform') === beforeTransform,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgInteractionProjectionInvalidViewport = async (): Promise<GeometryErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
  const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
  const beforeTransform = projection?.getAttribute('transform') ?? null;
  const error = captureRendererError(() =>
    renderer.updateInteraction({
      type: 'viewport-pan',
      baseViewport: { x: 10, y: 20, zoom: 2 },
      viewport: { x: Number.POSITIVE_INFINITY, y: 50, zoom: 2 },
    }),
  );
  const result: GeometryErrorResult = {
    error,
    projectionUnchanged: projection?.getAttribute('transform') === beforeTransform,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgRuntimeInteractionProjection = async (): Promise<RuntimeInteractionProjectionResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const host = createPluginHost();
  const rendererPlugin = createRendererPlugin(createSvgRenderer);
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  let renderer: RendererService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, session: sessionService, renderer: rendererService },
    setup(context) {
      kernel = context.services.kernel;
      session = context.services.session;
      renderer = context.services.renderer;
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(sessionPlugin),
    host.install(rendererPlugin, { target }),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !session || !renderer) throw new Error('Expected the real Renderer Runtime Services.');
  const previewedNodeId = nodeId('runtime-interaction-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: previewedNodeId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  session.setSelection({ nodeIds: [previewedNodeId], edgeIds: [] });
  const binding = renderer.bindInteractionProjection();
  binding.update({
    type: 'node-drag',
    nodes: [
      {
        nodeId: previewedNodeId,
        basePosition: { x: 10, y: 20 },
        position: { x: 80, y: 90 },
      },
    ],
  });
  const node = target.querySelector<SVGRectElement>('[data-cflow-node-id="runtime-interaction-node"]');
  if (!node) throw new Error('Expected the Runtime Interaction Projection Node.');
  const previewX = node.getAttribute('x');
  binding.dispose();
  const result: RuntimeInteractionProjectionResult = {
    previewX,
    restoredX: node.getAttribute('x'),
  };
  await host.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket02FirstEdge = async (): Promise<FirstEdgeResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);

  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const sourceId = nodeId('node-a');
  const targetId = nodeId('node-b');
  const thirdId = nodeId('node-c');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: thirdId,
      type: 'task',
      position: { x: 340, y: 180 },
      size: { width: 40, height: 30 },
      data: null,
    });
    transaction.nodes.add({
      id: sourceId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'task',
      position: { x: 200, y: 100 },
      size: { width: 100, height: 60 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('edge-b'),
      type: 'straight',
      source: { nodeId: targetId },
      target: { nodeId: thirdId },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('edge-a'),
      type: 'straight',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });

  const projection = target.querySelector<SVGGElement>(':scope > .cflow-renderer-svg');
  const edge = projection?.querySelector<SVGLineElement>('[data-cflow-edge-id="edge-a"]');
  if (!projection || !edge) throw new Error('Expected the SVG Projection to contain the first Edge.');
  const result: FirstEdgeResult = {
    layerClasses: Array.from(projection.children, (child) => child.getAttribute('class')),
    edgeIds: Array.from(projection.querySelectorAll('[data-cflow-edge-id]'), (element) =>
      element.getAttribute('data-cflow-edge-id'),
    ),
    nodeIds: Array.from(projection.querySelectorAll('[data-cflow-node-id]'), (element) =>
      element.getAttribute('data-cflow-node-id'),
    ),
    edge: {
      tagName: edge.tagName,
      id: edge.getAttribute('data-cflow-edge-id'),
      x1: edge.getAttribute('x1'),
      y1: edge.getAttribute('y1'),
      x2: edge.getAttribute('x2'),
      y2: edge.getAttribute('y2'),
    },
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket02PortError = async (): Promise<GeometryErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const sourceId = nodeId('port-source');
  const targetId = nodeId('port-target');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'task',
      position: { x: 200, y: 100 },
      size: { width: 100, height: 60 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const projectionBefore = target.querySelector('.cflow-renderer-svg')?.innerHTML;
  kernel.transact((transaction) => {
    transaction.edges.add({
      id: edgeId('port-edge'),
      type: 'straight',
      source: { nodeId: sourceId, portId: 'out' },
      target: { nodeId: targetId },
      data: null,
    });
  });

  let errorResult: GeometryErrorResult['error'] = null;
  try {
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
  } catch (error) {
    const structured = error as Readonly<{
      name: string;
      domain: string;
      code: string;
      details: unknown;
    }>;
    errorResult = {
      name: structured.name,
      domain: structured.domain,
      code: structured.code,
      details: structured.details,
    };
  }
  const result: GeometryErrorResult = {
    error: errorResult,
    projectionUnchanged: target.querySelector('.cflow-renderer-svg')?.innerHTML === projectionBefore,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket02SelfLoopError = async (): Promise<GeometryErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const node = nodeId('loop-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: node,
      type: 'task',
      position: { x: 20, y: 30 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const projectionBefore = target.querySelector('.cflow-renderer-svg')?.innerHTML;
  kernel.transact((transaction) => {
    transaction.edges.add({
      id: edgeId('loop-edge'),
      type: 'straight',
      source: { nodeId: node },
      target: { nodeId: node },
      data: null,
    });
  });

  let errorResult: GeometryErrorResult['error'] = null;
  try {
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
  } catch (error) {
    const structured = error as Readonly<{
      name: string;
      domain: string;
      code: string;
      details: unknown;
    }>;
    errorResult = {
      name: structured.name,
      domain: structured.domain,
      code: structured.code,
      details: structured.details,
    };
  }
  const result: GeometryErrorResult = {
    error: errorResult,
    projectionUnchanged: target.querySelector('.cflow-renderer-svg')?.innerHTML === projectionBefore,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket02MissingSizeError = async (): Promise<GeometryErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const projectionBefore = target.querySelector('.cflow-renderer-svg')?.innerHTML;
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('unsized-node'),
      type: 'task',
      position: { x: 20, y: 30 },
      data: null,
    });
  });

  let errorResult: GeometryErrorResult['error'] = null;
  try {
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
  } catch (error) {
    const structured = error as Readonly<{
      name: string;
      domain: string;
      code: string;
      details: unknown;
    }>;
    errorResult = {
      name: structured.name,
      domain: structured.domain,
      code: structured.code,
      details: structured.details,
    };
  }
  const result: GeometryErrorResult = {
    error: errorResult,
    projectionUnchanged: target.querySelector('.cflow-renderer-svg')?.innerHTML === projectionBefore,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket03FirstCommit = async (): Promise<FirstCommitResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('moving-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const before = target.querySelector<SVGRectElement>('[data-cflow-node-id="moving-node"]');
  if (!before) throw new Error('Expected the initial keyed Node element.');

  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 50 },
      size: { width: 120, height: 70 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected a net-changing Node Commit.');
  renderer.updateDocument({ type: 'commit', commit });
  const after = target.querySelector<SVGRectElement>('[data-cflow-node-id="moving-node"]');
  if (!after) throw new Error('Expected the keyed Node after Commit.');

  const result: FirstCommitResult = {
    preservedNodeIdentity: before === after,
    node: {
      x: after.getAttribute('x'),
      y: after.getAttribute('y'),
      width: after.getAttribute('width'),
      height: after.getAttribute('height'),
    },
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket03AddRemove = async (): Promise<AddRemoveCommitResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const nodeB = nodeId('node-b');
  const nodeC = nodeId('node-c');
  const nodeD = nodeId('node-d');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeD,
      type: 'task',
      position: { x: 300, y: 200 },
      size: { width: 60, height: 50 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeB,
      type: 'task',
      position: { x: 20, y: 30 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeC,
      type: 'task',
      position: { x: 160, y: 100 },
      size: { width: 100, height: 60 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('edge-d'),
      type: 'straight',
      source: { nodeId: nodeC },
      target: { nodeId: nodeD },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('edge-b'),
      type: 'straight',
      source: { nodeId: nodeB },
      target: { nodeId: nodeC },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const existingNode = target.querySelector('[data-cflow-node-id="node-c"]');
  const existingEdge = target.querySelector('[data-cflow-edge-id="edge-d"]');
  if (!existingNode || !existingEdge) throw new Error('Expected initial keyed entities.');

  const nodeA = nodeId('node-a');
  const commit = kernel.transact((transaction) => {
    transaction.edges.remove(edgeId('edge-b'));
    transaction.nodes.remove(nodeB);
    transaction.nodes.add({
      id: nodeA,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 30 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('edge-a'),
      type: 'straight',
      source: { nodeId: nodeA },
      target: { nodeId: nodeC },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected an add/remove Commit.');
  renderer.updateDocument({ type: 'commit', commit });
  const result: AddRemoveCommitResult = {
    nodeIds: Array.from(target.querySelectorAll('[data-cflow-node-id]'), (element) =>
      element.getAttribute('data-cflow-node-id'),
    ),
    edgeIds: Array.from(target.querySelectorAll('[data-cflow-edge-id]'), (element) =>
      element.getAttribute('data-cflow-edge-id'),
    ),
    preservedNodeIdentity: existingNode === target.querySelector('[data-cflow-node-id="node-c"]'),
    preservedEdgeIdentity: existingEdge === target.querySelector('[data-cflow-edge-id="edge-d"]'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket03EdgeReplace = async (): Promise<EdgeReplaceResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const nodeA = nodeId('edge-node-a');
  const nodeB = nodeId('edge-node-b');
  const nodeC = nodeId('edge-node-c');
  const id = edgeId('moving-edge');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeA,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeB,
      type: 'task',
      position: { x: 100, y: 60 },
      size: { width: 60, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeC,
      type: 'task',
      position: { x: 300, y: 200 },
      size: { width: 40, height: 30 },
      data: null,
    });
    transaction.edges.add({
      id,
      type: 'straight',
      source: { nodeId: nodeA },
      target: { nodeId: nodeB },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const before = target.querySelector<SVGLineElement>('[data-cflow-edge-id="moving-edge"]');
  if (!before) throw new Error('Expected the initial keyed Edge.');
  const commit = kernel.transact((transaction) => {
    transaction.edges.replace(id, {
      id,
      type: 'straight',
      source: { nodeId: nodeA },
      target: { nodeId: nodeC },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected an Edge replace Commit.');
  renderer.updateDocument({ type: 'commit', commit });
  const after = target.querySelector<SVGLineElement>('[data-cflow-edge-id="moving-edge"]');
  if (!after) throw new Error('Expected the keyed Edge after Commit.');
  const result: EdgeReplaceResult = {
    preservedEdgeIdentity: before === after,
    x2: after.getAttribute('x2'),
    y2: after.getAttribute('y2'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket03Continuity = async (): Promise<ContinuityResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('continuity-node');
  const firstCommit = kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
  });
  if (!firstCommit) throw new Error('Expected the first continuity Commit.');
  const withoutBaseline = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit: firstCommit }));
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const secondCommit = replaceContinuityNode(kernel, id, 20);
  renderer.updateDocument({ type: 'commit', commit: secondCommit });
  const duplicate = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit: secondCommit }));
  replaceContinuityNode(kernel, id, 30);
  const fourthCommit = replaceContinuityNode(kernel, id, 40);
  const gap = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit: fourthCommit }));
  const beforeReset = target.querySelector('[data-cflow-node-id="continuity-node"]');
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const afterReset = target.querySelector<SVGRectElement>('[data-cflow-node-id="continuity-node"]');
  if (!beforeReset || !afterReset) throw new Error('Expected continuity Node around reset.');
  const result: ContinuityResult = {
    withoutBaseline,
    duplicate,
    gap,
    resetReplacedNodeIdentity: beforeReset !== afterReset,
    resetX: afterReset.getAttribute('x'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

function captureRendererError(callback: () => void): GeometryErrorResult['error'] {
  try {
    callback();
    return null;
  } catch (error) {
    const structured = error as Readonly<{
      name: string;
      domain: string;
      code: string;
      details: unknown;
    }>;
    return {
      name: structured.name,
      domain: structured.domain,
      code: structured.code,
      details: structured.details,
    };
  }
}

function describeCapturedRendererError(error: unknown): GeometryErrorResult['error'] {
  if (error === undefined) return null;
  const structured = error as Readonly<{
    name: string;
    domain: string;
    code: string;
    details: unknown;
  }>;
  return {
    name: structured.name,
    domain: structured.domain,
    code: structured.code,
    details: structured.details,
  };
}

function replaceContinuityNode(
  kernel: ReturnType<typeof createCanvasKernel>,
  id: ReturnType<typeof nodeId>,
  x: number,
) {
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected a continuity Node Commit.');
  return commit;
}

globalThis.__cflowRendererSvgTicket04DerivedEdge = async (): Promise<DerivedEdgeResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const sourceId = nodeId('derived-source');
  const targetId = nodeId('derived-target');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'task',
      position: { x: 300, y: 200 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('derived-edge'),
      type: 'straight',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const before = target.querySelector<SVGLineElement>('[data-cflow-edge-id="derived-edge"]');
  if (!before) throw new Error('Expected the initial derived Edge.');
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(sourceId, {
      id: sourceId,
      type: 'task',
      position: { x: 100, y: 50 },
      size: { width: 100, height: 60 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected a Node Geometry Commit.');
  renderer.updateDocument({ type: 'commit', commit });
  const after = target.querySelector<SVGLineElement>('[data-cflow-edge-id="derived-edge"]');
  if (!after) throw new Error('Expected the derived Edge after Commit.');
  const result: DerivedEdgeResult = {
    preservedEdgeIdentity: before === after,
    x1: after.getAttribute('x1'),
    y1: after.getAttribute('y1'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket04BeforeMismatch = async (): Promise<EvidenceErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('evidence-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const projectionBefore = target.querySelector('.cflow-renderer-svg')?.innerHTML;
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 40 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected an evidence Commit.');
  const beforeNode = commit.before.snapshot.nodes[0];
  if (!beforeNode) throw new Error('Expected the evidence Commit before Node.');
  const forgedCommit = {
    ...commit,
    before: {
      snapshot: {
        ...commit.before.snapshot,
        nodes: [{ ...beforeNode, position: { x: 999, y: beforeNode.position.y } }],
      },
      query: commit.before.query,
    },
  };
  const error = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit: forgedCommit }));
  const result: EvidenceErrorResult = {
    error,
    projectionUnchanged: target.querySelector('.cflow-renderer-svg')?.innerHTML === projectionBefore,
    nodeX: target.querySelector('[data-cflow-node-id="evidence-node"]')?.getAttribute('x') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket04ChangeSetMismatch = async (): Promise<ChangeSetMismatchResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('change-set-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const projectionBefore = target.querySelector('.cflow-renderer-svg')?.innerHTML;
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 40 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected a Change Set Commit.');
  const forgedCommit = {
    ...commit,
    changeSet: { ...commit.changeSet, changes: [] },
  };
  const error = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit: forgedCommit }));
  const projectionUnchanged = target.querySelector('.cflow-renderer-svg')?.innerHTML === projectionBefore;
  renderer.updateDocument({ type: 'commit', commit });
  const result: ChangeSetMismatchResult = {
    error,
    projectionUnchanged,
    nodeX: projectionUnchanged ? '10' : null,
    recoveredX: target.querySelector('[data-cflow-node-id="change-set-node"]')?.getAttribute('x') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket04SnapshotOrder = async (): Promise<SnapshotErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('node-b'),
      type: 'task',
      position: { x: 100, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeId('node-a'),
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
  });
  const view = kernel.read();
  const projectionBefore = target.querySelector('.cflow-renderer-svg')?.innerHTML;
  const forgedView = {
    snapshot: { ...view.snapshot, nodes: [...view.snapshot.nodes].reverse() },
    query: view.query,
  };
  const error = captureRendererError(() => renderer.updateDocument({ type: 'reset', view: forgedView }));
  const projectionUnchanged = target.querySelector('.cflow-renderer-svg')?.innerHTML === projectionBefore;
  renderer.updateDocument({ type: 'reset', view });
  const result: SnapshotErrorResult = {
    error,
    projectionUnchanged,
    nodeX: projectionUnchanged ? null : 'changed',
    recoveredNodeIds: Array.from(target.querySelectorAll('[data-cflow-node-id]'), (element) =>
      element.getAttribute('data-cflow-node-id'),
    ),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket04BaselineIsolation = async (): Promise<BaselineIsolationResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('isolated-node');
  const firstData = { version: 1 };
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: firstData,
    });
  });
  const realView = kernel.read();
  const realNode = realView.snapshot.nodes[0];
  if (!realNode?.size) throw new Error('Expected a sized isolation Node.');
  const mutableNode = {
    ...realNode,
    position: { ...realNode.position },
    size: { ...realNode.size },
  };
  renderer.updateDocument({
    type: 'reset',
    view: {
      snapshot: { revision: realView.snapshot.revision, nodes: [mutableNode], edges: [] },
      query: realView.query,
    },
  });
  mutableNode.position.x = 999;
  const geometryCommit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 20 },
      size: { width: 80, height: 40 },
      data: firstData,
    });
  });
  if (!geometryCommit) throw new Error('Expected an isolation Geometry Commit.');
  renderer.updateDocument({ type: 'commit', commit: geometryCommit });
  const elementAfterGeometry = target.querySelector<SVGRectElement>('[data-cflow-node-id="isolated-node"]');
  if (!elementAfterGeometry) throw new Error('Expected the isolated Node after Geometry Commit.');
  const mutableShellWasIsolated = elementAfterGeometry.getAttribute('x') === '30';
  const domBeforeData = elementAfterGeometry.outerHTML;
  const secondData = { version: 2 };
  const dataCommit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 20 },
      size: { width: 80, height: 40 },
      data: secondData,
    });
  });
  if (!dataCommit) throw new Error('Expected a data-only Commit.');
  renderer.updateDocument({ type: 'commit', commit: dataCommit });
  const elementAfterData = target.querySelector<SVGRectElement>('[data-cflow-node-id="isolated-node"]');
  if (!elementAfterData) throw new Error('Expected the isolated Node after data-only Commit.');
  const dataOnlyPreservedDom = domBeforeData === elementAfterData.outerHTML;
  const finalCommit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 50, y: 20 },
      size: { width: 80, height: 40 },
      data: secondData,
    });
  });
  if (!finalCommit) throw new Error('Expected the post-data Commit.');
  renderer.updateDocument({ type: 'commit', commit: finalCommit });
  const result: BaselineIsolationResult = {
    mutableShellWasIsolated,
    dataOnlyPreservedIdentity: elementAfterGeometry === elementAfterData,
    dataOnlyPreservedDom,
    nextCommitX: elementAfterData.getAttribute('x'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket04SnapshotGraph = async (): Promise<SnapshotGraphResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('graph-a'),
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeId('graph-b'),
      type: 'task',
      position: { x: 100, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
  });
  const view = kernel.read();
  const nodeA = view.snapshot.nodes[0];
  const nodeB = view.snapshot.nodes[1];
  if (!nodeA || !nodeB) throw new Error('Expected graph validation Nodes.');
  const projectionBefore = target.querySelector('.cflow-renderer-svg')?.innerHTML;
  const duplicate = captureRendererError(() =>
    renderer.updateDocument({
      type: 'reset',
      view: {
        snapshot: { revision: view.snapshot.revision, nodes: [nodeA, nodeA], edges: [] },
        query: view.query,
      },
    }),
  );
  const missingEndpoint = captureRendererError(() =>
    renderer.updateDocument({
      type: 'reset',
      view: {
        snapshot: {
          revision: view.snapshot.revision,
          nodes: view.snapshot.nodes,
          edges: [
            {
              id: edgeId('graph-edge'),
              type: 'straight',
              source: { nodeId: nodeA.id },
              target: { nodeId: nodeId('missing-node') },
              data: null,
            },
          ],
        },
        query: view.query,
      },
    }),
  );
  const parentCycle = captureRendererError(() =>
    renderer.updateDocument({
      type: 'reset',
      view: {
        snapshot: {
          revision: view.snapshot.revision,
          nodes: [
            { ...nodeA, parentId: nodeB.id },
            { ...nodeB, parentId: nodeA.id },
          ],
          edges: [],
        },
        query: view.query,
      },
    }),
  );
  const projectionUnchanged = target.querySelector('.cflow-renderer-svg')?.innerHTML === projectionBefore;
  renderer.updateDocument({ type: 'reset', view });
  const result: SnapshotGraphResult = {
    duplicate,
    missingEndpoint,
    parentCycle,
    projectionUnchanged,
    recoveredNodeIds: Array.from(target.querySelectorAll('[data-cflow-node-id]'), (element) =>
      element.getAttribute('data-cflow-node-id'),
    ),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket05RollbackSuccess = async (): Promise<RollbackSuccessResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('rollback-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const element = target.querySelector<SVGRectElement>('[data-cflow-node-id="rollback-node"]');
  if (!element) throw new Error('Expected rollback Node.');
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 40 },
      size: { width: 100, height: 60 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected rollback Commit.');
  const injected = new Error('injected attribute failure');
  const originalSetAttribute = element.setAttribute;
  let throwOnce = true;
  element.setAttribute = function setAttribute(name: string, value: string): void {
    if (name === 'y' && throwOnce) {
      throwOnce = false;
      throw injected;
    }
    originalSetAttribute.call(this, name, value);
  };
  let caught: unknown;
  try {
    renderer.updateDocument({ type: 'commit', commit });
  } catch (error) {
    caught = error;
  } finally {
    element.setAttribute = originalSetAttribute;
  }
  const rollbackX = element.getAttribute('x');
  renderer.updateDocument({ type: 'commit', commit });
  const result: RollbackSuccessResult = {
    sameErrorIdentity: caught === injected,
    errorName: caught instanceof Error ? caught.name : null,
    errorMessage: caught instanceof Error ? caught.message : null,
    rollbackX,
    recoveredX: element.getAttribute('x'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket05RollbackFailure = async (): Promise<RollbackFailureResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('rollback-failure-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const session = {
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  } as const;
  renderer.updateSession(session);
  let inputCount = 0;
  const unsubscribeInput = renderer.subscribeInput(() => {
    inputCount += 1;
  });
  const element = target.querySelector<SVGRectElement>('[data-cflow-node-id="rollback-failure-node"]');
  if (!element) throw new Error('Expected rollback-failure Node.');
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 40 },
      size: { width: 100, height: 60 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected rollback-failure Commit.');
  const primaryError = new Error('primary DOM mutation failed');
  const rollbackYError = new Error('rollback y failed');
  const rollbackXError = new Error('rollback x failed');
  const originalSetAttribute = element.setAttribute;
  element.setAttribute = function setAttribute(name: string, value: string): void {
    if (name === 'y' && value === '40') throw primaryError;
    if (name === 'y' && value === '20') throw rollbackYError;
    if (name === 'x' && value === '10') throw rollbackXError;
    originalSetAttribute.call(this, name, value);
  };
  let caught: unknown;
  try {
    renderer.updateDocument({ type: 'commit', commit });
  } catch (error) {
    caught = error;
  } finally {
    element.setAttribute = originalSetAttribute;
  }
  const aggregateErrors = caught instanceof AggregateError ? caught.errors : [];
  const blockedCommit = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit }));
  const blockedSession = captureRendererError(() => renderer.updateSession(session));
  let nativeInputError: unknown;
  const captureNativeInputError = (event: ErrorEvent): void => {
    nativeInputError = event.error;
    event.preventDefault();
  };
  window.addEventListener('error', captureNativeInputError);
  target.dispatchEvent(
    new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
      deltaY: 1,
    }),
  );
  await new Promise<void>((resolve) => setTimeout(resolve));
  window.removeEventListener('error', captureNativeInputError);
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const result: RollbackFailureResult = {
    aggregateName: caught instanceof Error ? caught.name : null,
    aggregateMessage: caught instanceof Error ? caught.message : null,
    aggregateErrorCount: aggregateErrors.length,
    includesPrimaryError: aggregateErrors.includes(primaryError),
    includesRollbackYError: aggregateErrors.includes(rollbackYError),
    includesRollbackXError: aggregateErrors.includes(rollbackXError),
    blockedCommit,
    blockedSession,
    blockedInput: describeCapturedRendererError(nativeInputError),
    inputCount,
    resetX: target.querySelector('[data-cflow-node-id="rollback-failure-node"]')?.getAttribute('x') ?? null,
  };
  unsubscribeInput();
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket05LayerRollback = async (): Promise<LayerRollbackResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '500');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const nodeB = nodeId('layer-b');
  const nodeC = nodeId('layer-c');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeB,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeC,
      type: 'task',
      position: { x: 120, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const elementB = target.querySelector('[data-cflow-node-id="layer-b"]');
  const elementC = target.querySelector<SVGRectElement>('[data-cflow-node-id="layer-c"]');
  if (!elementB || !elementC) throw new Error('Expected initial layer rollback Nodes.');
  const nodeA = nodeId('layer-a');
  const commit = kernel.transact((transaction) => {
    transaction.nodes.remove(nodeB);
    transaction.nodes.add({
      id: nodeA,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
    transaction.nodes.replace(nodeC, {
      id: nodeC,
      type: 'task',
      position: { x: 160, y: 80 },
      size: { width: 100, height: 60 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected a layer rollback Commit.');
  const injected = new Error('layer mutation failed');
  const originalSetAttribute = elementC.setAttribute;
  let throwOnce = true;
  elementC.setAttribute = function setAttribute(name: string, value: string): void {
    if (name === 'y' && throwOnce) {
      throwOnce = false;
      throw injected;
    }
    originalSetAttribute.call(this, name, value);
  };
  let caught: unknown;
  try {
    renderer.updateDocument({ type: 'commit', commit });
  } catch (error) {
    caught = error;
  } finally {
    elementC.setAttribute = originalSetAttribute;
  }
  const rollbackNodeIds = Array.from(target.querySelectorAll('[data-cflow-node-id]'), (element) =>
    element.getAttribute('data-cflow-node-id'),
  );
  const restoredBIdentity = elementB === target.querySelector('[data-cflow-node-id="layer-b"]');
  const restoredCIdentity = elementC === target.querySelector('[data-cflow-node-id="layer-c"]');
  renderer.updateDocument({ type: 'commit', commit });
  const result: LayerRollbackResult = {
    sameErrorIdentity: caught === injected,
    rollbackNodeIds,
    restoredBIdentity,
    restoredCIdentity,
    recoveredNodeIds: Array.from(target.querySelectorAll('[data-cflow-node-id]'), (element) =>
      element.getAttribute('data-cflow-node-id'),
    ),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket06SessionProjection = async (): Promise<SessionProjectionResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '200');
  target.setAttribute('viewBox', '0 0 200 100');
  target.setAttribute('preserveAspectRatio', 'none');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('session-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [id], edgeIds: [] },
    viewport: { x: 20, y: 10, zoom: 2 },
  });
  const result: SessionProjectionResult = {
    transform: target.querySelector('.cflow-renderer-svg')?.getAttribute('transform') ?? null,
    selected: target.querySelector('[data-cflow-node-id="session-node"]')?.getAttribute('data-cflow-selected') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket06BeforeBaseline = async (): Promise<SessionErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '200');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const error = captureRendererError(() =>
    renderer.updateSession({
      selection: { nodeIds: [], edgeIds: [] },
      viewport: { x: 20, y: 10, zoom: 2 },
    }),
  );
  const result: SessionErrorResult = {
    error,
    transform: target.querySelector('.cflow-renderer-svg')?.getAttribute('transform') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket06SessionValidation = async (): Promise<SessionValidationResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '200');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const nodeA = nodeId('session-a');
  const nodeB = nodeId('session-b');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeA,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeB,
      type: 'task',
      position: { x: 100, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [nodeA], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
  const dangling = captureRendererError(() =>
    renderer.updateSession({
      selection: { nodeIds: [nodeId('missing-node')], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  );
  const nonCanonical = captureRendererError(() =>
    renderer.updateSession({
      selection: { nodeIds: [nodeB, nodeA], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  );
  const duplicate = captureRendererError(() =>
    renderer.updateSession({
      selection: { nodeIds: [nodeA, nodeA], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  );
  const invalidZoom = captureRendererError(() =>
    renderer.updateSession({
      selection: { nodeIds: [], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 0 },
    }),
  );
  const result: SessionValidationResult = {
    dangling,
    nonCanonical,
    duplicate,
    invalidZoom,
    transform: target.querySelector('.cflow-renderer-svg')?.getAttribute('transform') ?? null,
    selectedA: target.querySelector('[data-cflow-node-id="session-a"]')?.getAttribute('data-cflow-selected') ?? null,
    selectedB: target.querySelector('[data-cflow-node-id="session-b"]')?.getAttribute('data-cflow-selected') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket06ResizeProjection = async (): Promise<ResizeProjectionResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '200');
  target.setAttribute('viewBox', '0 0 200 100');
  target.setAttribute('preserveAspectRatio', 'none');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const projection = target.querySelector('.cflow-renderer-svg');
  const before = projection?.getAttribute('transform') ?? null;
  target.setAttribute('width', '200');
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const result: ResizeProjectionResult = {
    before,
    after: projection?.getAttribute('transform') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket06SessionCoherence = async (): Promise<SessionCoherenceResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '200');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('selected-delete-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [id], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const commit = kernel.transact((transaction) => transaction.nodes.remove(id));
  if (!commit) throw new Error('Expected a selected Node deletion Commit.');
  const error = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit }));
  const nodeRemainedAfterRejection = target.querySelector('[data-cflow-node-id="selected-delete-node"]') !== null;
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  renderer.updateDocument({ type: 'commit', commit });
  const result: SessionCoherenceResult = {
    error,
    nodeRemainedAfterRejection,
    nodeRemovedAfterSessionUpdate: target.querySelector('[data-cflow-node-id="selected-delete-node"]') === null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket06TargetUnavailable = async (): Promise<TargetUnavailableResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '200');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('availability-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const session = {
    selection: { nodeIds: [id], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  } as const;
  renderer.updateSession(session);
  target.remove();
  const detached = captureRendererError(() => renderer.updateSession(session));
  document.body.append(target);
  target.setAttribute('width', '0');
  await nextRenderFrames();
  const zeroSize = captureRendererError(() => renderer.updateSession(session));
  target.setAttribute('width', '400');
  target.style.transform = 'matrix(0, 0, 0, 1, 0, 0)';
  await nextRenderFrames();
  const singular = captureRendererError(() => renderer.updateSession(session));
  const selectedAfterFailures = target
    .querySelector('[data-cflow-node-id="availability-node"]')
    ?.getAttribute('data-cflow-selected');
  target.style.transform = '';
  await nextRenderFrames();
  renderer.updateSession({
    selection: { nodeIds: [id], edgeIds: [] },
    viewport: { x: 5, y: 6, zoom: 2 },
  });
  const result: TargetUnavailableResult = {
    detached,
    zeroSize,
    singular,
    selectedAfterFailures: selectedAfterFailures ?? null,
    recoveredTransform: target.querySelector('.cflow-renderer-svg')?.getAttribute('transform') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

function nextRenderFrames(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

globalThis.__cflowRendererSvgTicket07FirstHits = async (): Promise<HitTestResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const nodeA = nodeId('node-a');
  const nodeB = nodeId('node-b');
  const nodeC = nodeId('node-c');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeA,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeB,
      type: 'task',
      position: { x: 200, y: 0 },
      size: { width: 40, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeC,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('edge-a'),
      type: 'straight',
      source: { nodeId: nodeA },
      target: { nodeId: nodeB },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 20, y: 10, zoom: 2 },
  });
  const decoration = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  decoration.setAttribute('x', '90');
  decoration.setAttribute('y', '90');
  decoration.setAttribute('width', '30');
  decoration.setAttribute('height', '30');
  decoration.setAttribute('data-caller-decoration', '');
  target.append(decoration);
  const result: HitTestResult = {
    node: renderer.hitTest({ x: 40, y: 30 }),
    edge: renderer.hitTest({ x: 220, y: 50 }),
    canvas: renderer.hitTest({ x: 220, y: 210 }),
    outside: renderer.hitTest({ x: 401, y: 10 }),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket07Tolerance = async (): Promise<HitToleranceResult> => {
  const kernel = createCanvasKernel();
  const nodeA = nodeId('tolerance-a');
  const nodeB = nodeId('tolerance-b');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeA,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeB,
      type: 'task',
      position: { x: 200, y: 0 },
      size: { width: 40, height: 40 },
      data: null,
    });
    for (const id of [edgeId('edge-b'), edgeId('edge-a')]) {
      transaction.edges.add({
        id,
        type: 'straight',
        source: { nodeId: nodeA },
        target: { nodeId: nodeB },
        data: null,
      });
    }
  });
  const createTarget = (): SVGSVGElement => {
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    target.setAttribute('width', '400');
    target.setAttribute('height', '300');
    document.body.append(target);
    return target;
  };
  const defaultTarget = createTarget();
  const defaultRenderer = createSvgRenderer({ target: defaultTarget });
  defaultRenderer.updateDocument({ type: 'reset', view: kernel.read() });
  defaultRenderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  for (const edge of defaultTarget.querySelectorAll<SVGLineElement>('[data-cflow-edge-id]')) {
    edge.style.strokeWidth = '100px';
  }
  const defaultNear = defaultRenderer.hitTest({ x: 100, y: 25 });

  const configuredTarget = createTarget();
  const configuredRenderer = createSvgRenderer({ target: configuredTarget, edgeHitTolerance: 6 });
  configuredRenderer.updateDocument({ type: 'reset', view: kernel.read() });
  configuredRenderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const configuredNear = configuredRenderer.hitTest({ x: 100, y: 25 });
  const reverseOrder = configuredRenderer.hitTest({ x: 100, y: 20 });
  const invalidPoint = captureRendererError(() => configuredRenderer.hitTest({ x: Number.NaN, y: 20 }));
  const result: HitToleranceResult = {
    defaultNear,
    configuredNear,
    reverseOrder,
    invalidPoint,
  };
  await Promise.all([defaultRenderer.dispose(), configuredRenderer.dispose()]);
  defaultTarget.remove();
  configuredTarget.remove();
  return result;
};

let ticket08Renderer: CanvasRenderer | undefined;
let ticket08Target: SVGSVGElement | undefined;
let stopTicket08Input: (() => void) | undefined;
const ticket08Inputs: RendererInput[] = [];
let interactionProjectionInputRenderer: CanvasRenderer | undefined;
let interactionProjectionInputTarget: SVGSVGElement | undefined;
let stopInteractionProjectionInput: (() => void) | undefined;
const interactionProjectionInputs: RendererInput[] = [];
let selectionInteractionHost: ReturnType<typeof createPluginHost> | undefined;
let selectionInteractionTarget: SVGSVGElement | undefined;
let selectionInteractionSession: SessionService | undefined;

globalThis.__cflowRendererSvgSetupSelectionInteraction = async (): Promise<void> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.id = 'selection-interaction-target';
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  target.style.position = 'fixed';
  target.style.left = '0';
  target.style.top = '0';
  target.style.zIndex = '1002';
  document.body.append(target);
  const host = createPluginHost();
  const rendererPlugin = createRendererPlugin(createSvgRenderer);
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, session: sessionService },
    setup(context) {
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(rendererPlugin, { target }),
    host.install(interactionPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !session) throw new Error('Expected the real Interaction Runtime Services.');
  kernel.transact((transaction) => {
    const selectedNodeId = nodeId('selection-node');
    const targetNodeId = nodeId('selection-target-node');
    transaction.nodes.add({
      id: selectedNodeId,
      type: 'task',
      position: { x: 120, y: 100 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: targetNodeId,
      type: 'task',
      position: { x: 300, y: 100 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('selection-edge'),
      type: 'flow',
      source: { nodeId: selectedNodeId },
      target: { nodeId: targetNodeId },
      data: null,
    });
  });
  selectionInteractionHost = host;
  selectionInteractionTarget = target;
  selectionInteractionSession = session;
};

globalThis.__cflowRendererSvgReadSelectionInteraction = (): SelectionInteractionResult => {
  const selection = selectionInteractionSession?.getSnapshot().selection;
  if (!selection) throw new Error('Expected the Selection Interaction Session.');
  return selection;
};

globalThis.__cflowRendererSvgTeardownSelectionInteraction = async (): Promise<void> => {
  await selectionInteractionHost?.dispose();
  selectionInteractionHost = undefined;
  selectionInteractionSession = undefined;
  selectionInteractionTarget?.remove();
  selectionInteractionTarget = undefined;
};

globalThis.__cflowRendererSvgSetupInteractionProjectionInput = async (): Promise<void> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.id = 'interaction-projection-input-target';
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  target.style.position = 'fixed';
  target.style.left = '0';
  target.style.top = '0';
  target.style.zIndex = '1001';
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
  renderer.updateInteraction({
    type: 'viewport-pan',
    baseViewport: { x: 10, y: 20, zoom: 2 },
    viewport: { x: 40, y: 50, zoom: 2 },
  });
  interactionProjectionInputs.length = 0;
  stopInteractionProjectionInput = renderer.subscribeInput((input) => interactionProjectionInputs.push(input));
  interactionProjectionInputRenderer = renderer;
  interactionProjectionInputTarget = target;
};

globalThis.__cflowRendererSvgReadInteractionProjectionInput = (): RendererInput | undefined =>
  interactionProjectionInputs.find((input) => input.type === 'pointer.down');

globalThis.__cflowRendererSvgTeardownInteractionProjectionInput = async (): Promise<void> => {
  stopInteractionProjectionInput?.();
  stopInteractionProjectionInput = undefined;
  await interactionProjectionInputRenderer?.dispose();
  interactionProjectionInputRenderer = undefined;
  interactionProjectionInputTarget?.remove();
  interactionProjectionInputTarget = undefined;
};

globalThis.__cflowRendererSvgTicket08SetupPointer = async (): Promise<Readonly<{ x: number; y: number }>> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.id = 'ticket-08-pointer-target';
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  target.style.position = 'fixed';
  target.style.left = '0';
  target.style.top = '0';
  target.style.zIndex = '1000';
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
  ticket08Inputs.length = 0;
  stopTicket08Input = renderer.subscribeInput((input) => ticket08Inputs.push(input));
  ticket08Renderer = renderer;
  ticket08Target = target;
  const bounds = target.getBoundingClientRect();
  return { x: bounds.left, y: bounds.top };
};

globalThis.__cflowRendererSvgTicket08ReadPointer = (): readonly RendererInput[] => ticket08Inputs;

globalThis.__cflowRendererSvgTicket08TeardownPointer = async (): Promise<void> => {
  stopTicket08Input?.();
  stopTicket08Input = undefined;
  await ticket08Renderer?.dispose();
  ticket08Renderer = undefined;
  ticket08Target?.remove();
  ticket08Target = undefined;
};

globalThis.__cflowRendererSvgTicket08WheelKeyboardPolicy = async (): Promise<WheelKeyboardPolicyResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  target.setAttribute('tabindex', '-1');
  target.style.position = 'fixed';
  target.style.left = '0';
  target.style.top = '0';
  target.style.touchAction = 'pan-x';
  document.body.append(target);
  const renderer = createSvgRenderer({
    target,
    input: {
      wheel: { preventDefault: true, stopPropagation: true },
      keyboard: { stopPropagation: true },
      contextMenu: { preventDefault: true, stopPropagation: true },
    },
  });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
  const inputs: RendererInput[] = [];
  const stop = renderer.subscribeInput((input) => inputs.push(input));
  const bubbled = { wheel: 0, keyboard: 0, contextMenu: 0 };
  const countWheel = (): void => {
    bubbled.wheel += 1;
  };
  const countKeyboard = (): void => {
    bubbled.keyboard += 1;
  };
  const countContextMenu = (): void => {
    bubbled.contextMenu += 1;
  };
  document.body.addEventListener('wheel', countWheel);
  document.body.addEventListener('keydown', countKeyboard);
  document.body.addEventListener('contextmenu', countContextMenu);
  const wheelDispatchResults = [
    target.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: 50,
        clientY: 60,
        deltaX: 2,
        deltaY: 3,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
    target.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: 50,
        clientY: 60,
        deltaX: 1,
        deltaY: 2,
        deltaMode: WheelEvent.DOM_DELTA_LINE,
        bubbles: true,
        cancelable: true,
      }),
    ),
    target.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: 50,
        clientY: 60,
        deltaY: 1,
        deltaMode: WheelEvent.DOM_DELTA_PAGE,
        bubbles: true,
        cancelable: true,
      }),
    ),
  ];
  target.focus();
  const keyboardDispatchResults = [
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
        repeat: true,
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
    target.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'a',
        code: 'KeyA',
        bubbles: true,
        cancelable: true,
      }),
    ),
  ];
  const contextMenuDispatchResult = target.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
  );
  const result: WheelKeyboardPolicyResult = {
    inputs,
    wheelDispatchResults,
    keyboardDispatchResults,
    contextMenuDispatchResult,
    bubbled,
    touchAction: target.style.touchAction,
  };
  document.body.removeEventListener('wheel', countWheel);
  document.body.removeEventListener('keydown', countKeyboard);
  document.body.removeEventListener('contextmenu', countContextMenu);
  stop();
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket09InputOrder = async (): Promise<InputOrderResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const order: string[] = [];
  let stopSecond = (): void => undefined;
  const stopFirst = renderer.subscribeInput((input) => {
    order.push(`first:${input.type}`);
    if (input.type !== 'pointer.down') return;
    renderer.subscribeInput((nested) => order.push(`third:${nested.type}`));
    stopSecond();
    target.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 7,
        pointerType: 'mouse',
        clientX: 30,
        clientY: 40,
        buttons: 1,
        bubbles: true,
      }),
    );
  });
  stopSecond = renderer.subscribeInput((input) => order.push(`second:${input.type}`));
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 7,
      pointerType: 'mouse',
      clientX: 20,
      clientY: 30,
      button: 0,
      buttons: 1,
      bubbles: true,
    }),
  );
  stopFirst();
  stopSecond();
  const result: InputOrderResult = { order };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket09Focus = async (): Promise<FocusResult> => {
  const previousMinHeight = document.body.style.minHeight;
  document.body.style.minHeight = '2200px';
  window.scrollTo(0, 0);
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  target.style.position = 'absolute';
  target.style.left = '0';
  target.style.top = '1500px';
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const addedTabIndex = target.getAttribute('tabindex');
  renderer.focus();
  const active = document.activeElement === target;
  const scrollY = window.scrollY;
  await renderer.dispose();
  const restoredTabIndex = target.getAttribute('tabindex');
  target.remove();
  document.body.style.minHeight = previousMinHeight;
  return { addedTabIndex, active, scrollY, restoredTabIndex };
};

let captureRenderer: CanvasRenderer | undefined;
let captureTarget: SVGSVGElement | undefined;
let captureDestination: HTMLDivElement | undefined;
let stopCaptureInput: (() => void) | undefined;
let capturePointerId: number | undefined;
let captureUnknownBefore: GeometryErrorResult['error'] = null;
let captureSawDown = false;
let captureSawOutsideMove = false;
let captureSawUp = false;
let capturedDuringDown = false;
let capturedDuringUp = false;

globalThis.__cflowRendererSvgTicket09SetupCapture = async (): Promise<void> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.id = 'ticket-09-capture-target';
  target.setAttribute('width', '200');
  target.setAttribute('height', '200');
  target.style.position = 'fixed';
  target.style.left = '0';
  target.style.top = '0';
  target.style.zIndex = '1000';
  const surface = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  surface.setAttribute('width', '200');
  surface.setAttribute('height', '200');
  surface.setAttribute('fill', 'transparent');
  target.append(surface);
  const destination = document.createElement('div');
  destination.id = 'ticket-09-capture-destination';
  destination.textContent = 'destination';
  destination.style.position = 'fixed';
  destination.style.left = '320px';
  destination.style.top = '0';
  destination.style.width = '100px';
  destination.style.height = '100px';
  document.body.append(target, destination);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  captureUnknownBefore = captureRendererError(() => renderer.capturePointer(999));
  captureSawDown = false;
  captureSawOutsideMove = false;
  captureSawUp = false;
  capturedDuringDown = false;
  capturedDuringUp = false;
  capturePointerId = undefined;
  stopCaptureInput = renderer.subscribeInput((input) => {
    if (!input.type.startsWith('pointer.')) return;
    if (input.type === 'pointer.down') {
      captureSawDown = true;
      capturePointerId = input.pointerId;
      renderer.capturePointer(input.pointerId);
      renderer.capturePointer(input.pointerId);
      capturedDuringDown = target.hasPointerCapture(input.pointerId);
    } else if (input.type === 'pointer.move' && input.screenPoint.x > 200) {
      captureSawOutsideMove = true;
    } else if (input.type === 'pointer.up') {
      captureSawUp = true;
      capturedDuringUp = target.hasPointerCapture(input.pointerId);
    }
  });
  captureRenderer = renderer;
  captureTarget = target;
  captureDestination = destination;
};

globalThis.__cflowRendererSvgTicket09ReadCapture = (): PointerCaptureResult => {
  const pointerId = capturePointerId;
  return {
    unknownBefore: captureUnknownBefore,
    sawDown: captureSawDown,
    sawOutsideMove: captureSawOutsideMove,
    sawUp: captureSawUp,
    capturedDuringDown,
    capturedDuringUp,
    capturedAfterUp: pointerId === undefined ? false : captureTarget?.hasPointerCapture(pointerId) === true,
    afterUpError:
      pointerId === undefined || !captureRenderer
        ? null
        : captureRendererError(() => captureRenderer?.capturePointer(pointerId)),
  };
};

globalThis.__cflowRendererSvgTicket09TeardownCapture = async (): Promise<void> => {
  stopCaptureInput?.();
  stopCaptureInput = undefined;
  await captureRenderer?.dispose();
  captureRenderer = undefined;
  captureTarget?.remove();
  captureTarget = undefined;
  captureDestination?.remove();
  captureDestination = undefined;
};

let pointerCleanupRenderer: CanvasRenderer | undefined;
let pointerCleanupTarget: SVGSVGElement | undefined;
let stopPointerCleanupInput: (() => void) | undefined;
let pointerCleanupPointerId: number | undefined;
let pointerCleanupOriginalGetScreenCTM: SVGSVGElement['getScreenCTM'] | undefined;
let pointerCleanupOriginalReleasePointerCapture: SVGSVGElement['releasePointerCapture'] | undefined;
let pointerCleanupReleaseError: Error | undefined;
let pointerCleanupNativeError: unknown;
let pointerCleanupFirstResult:
  | Pick<
      PointerCleanupFailureResult,
      'nativeError' | 'capturedAfterFailedUp' | 'captureAfterFailedUp' | 'releaseAfterFailedUp'
    >
  | undefined;
let pointerCleanupDownCount = 0;
let pointerCleanupRecaptured = false;

const capturePointerCleanupNativeError = (event: ErrorEvent): void => {
  pointerCleanupNativeError = event.error;
  event.preventDefault();
};

globalThis.__cflowRendererSvgReviewSetupPointerCleanup = async (failNativeRelease = false): Promise<void> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.id = 'review-pointer-cleanup-target';
  target.setAttribute('width', '200');
  target.setAttribute('height', '200');
  target.style.position = 'fixed';
  target.style.left = '0';
  target.style.top = '0';
  target.style.zIndex = '1000';
  const surface = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  surface.setAttribute('width', '200');
  surface.setAttribute('height', '200');
  surface.setAttribute('fill', 'transparent');
  target.append(surface);
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  pointerCleanupPointerId = undefined;
  pointerCleanupNativeError = undefined;
  pointerCleanupFirstResult = undefined;
  pointerCleanupDownCount = 0;
  pointerCleanupRecaptured = false;
  pointerCleanupReleaseError = failNativeRelease
    ? new Error('injected native Pointer Capture release failure')
    : undefined;
  stopPointerCleanupInput = renderer.subscribeInput((input) => {
    if (input.type !== 'pointer.down') return;
    pointerCleanupDownCount += 1;
    pointerCleanupPointerId = input.pointerId;
    renderer.capturePointer(input.pointerId);
    if (pointerCleanupDownCount === 2) pointerCleanupRecaptured = target.hasPointerCapture(input.pointerId);
  });
  window.addEventListener('error', capturePointerCleanupNativeError);
  pointerCleanupRenderer = renderer;
  pointerCleanupTarget = target;
  pointerCleanupOriginalGetScreenCTM = target.getScreenCTM;
  pointerCleanupOriginalReleasePointerCapture = target.releasePointerCapture;
};

globalThis.__cflowRendererSvgReviewMakePointerTargetSingular = (): void => {
  if (!pointerCleanupTarget) throw new Error('Expected the Pointer cleanup Target.');
  pointerCleanupTarget.getScreenCTM = () => new DOMMatrix([0, 0, 0, 0, 0, 0]);
  const releaseError = pointerCleanupReleaseError;
  if (releaseError) {
    pointerCleanupTarget.releasePointerCapture = () => {
      throw releaseError;
    };
  }
};

globalThis.__cflowRendererSvgReviewFinishFaultedPointerUp = (): void => {
  const renderer = pointerCleanupRenderer;
  const target = pointerCleanupTarget;
  const pointerId = pointerCleanupPointerId;
  const originalGetScreenCTM = pointerCleanupOriginalGetScreenCTM;
  const originalReleasePointerCapture = pointerCleanupOriginalReleasePointerCapture;
  if (!renderer || !target || pointerId === undefined || !originalGetScreenCTM || !originalReleasePointerCapture) {
    throw new Error('Expected an active faulted Pointer cleanup scenario.');
  }
  target.getScreenCTM = originalGetScreenCTM;
  target.releasePointerCapture = originalReleasePointerCapture;
  pointerCleanupFirstResult = {
    nativeError: describeCapturedRendererError(pointerCleanupNativeError),
    capturedAfterFailedUp: target.hasPointerCapture(pointerId),
    captureAfterFailedUp: captureRendererError(() => renderer.capturePointer(pointerId)),
    releaseAfterFailedUp: captureRendererError(() => renderer.releasePointer(pointerId)),
  };
};

globalThis.__cflowRendererSvgReviewFinishPointerDoubleFailure = async (): Promise<PointerDoubleFailureResult> => {
  const renderer = pointerCleanupRenderer;
  const target = pointerCleanupTarget;
  const firstResult = pointerCleanupFirstResult;
  const cleanupError = pointerCleanupReleaseError;
  if (!renderer || !target || !firstResult || !cleanupError) {
    throw new Error('Expected a completed Pointer double-failure scenario.');
  }
  const aggregate = pointerCleanupNativeError;
  const aggregateErrors = aggregate instanceof AggregateError ? aggregate.errors : [];
  window.removeEventListener('error', capturePointerCleanupNativeError);
  stopPointerCleanupInput?.();
  stopPointerCleanupInput = undefined;
  await renderer.dispose();
  const replacement = createSvgRenderer({ target });
  await replacement.dispose();
  const result: PointerDoubleFailureResult = {
    aggregateName: aggregate instanceof Error ? aggregate.name : null,
    aggregateMessage: aggregate instanceof Error ? aggregate.message : null,
    aggregateErrorCount: aggregateErrors.length,
    handlingError: describeCapturedRendererError(aggregateErrors[0]),
    includesCleanupError: aggregateErrors.includes(cleanupError),
    captureAfterFailedUp: firstResult.captureAfterFailedUp,
    releaseAfterFailedUp: firstResult.releaseAfterFailedUp,
    reservationReusable: true,
  };
  target.remove();
  pointerCleanupRenderer = undefined;
  pointerCleanupTarget = undefined;
  pointerCleanupOriginalGetScreenCTM = undefined;
  pointerCleanupOriginalReleasePointerCapture = undefined;
  pointerCleanupReleaseError = undefined;
  return result;
};

globalThis.__cflowRendererSvgReviewReadPointerCleanup = (): PointerCleanupFailureResult => {
  const renderer = pointerCleanupRenderer;
  const target = pointerCleanupTarget;
  const pointerId = pointerCleanupPointerId;
  if (!renderer || !target || pointerId === undefined || !pointerCleanupFirstResult) {
    throw new Error('Expected a completed Pointer cleanup scenario.');
  }
  return {
    ...pointerCleanupFirstResult,
    recapturedOnNextDown: pointerCleanupRecaptured,
    capturedAfterNextUp: target.hasPointerCapture(pointerId),
    captureAfterNextUp: captureRendererError(() => renderer.capturePointer(pointerId)),
  };
};

globalThis.__cflowRendererSvgReviewTeardownPointerCleanup = async (): Promise<void> => {
  window.removeEventListener('error', capturePointerCleanupNativeError);
  stopPointerCleanupInput?.();
  stopPointerCleanupInput = undefined;
  await pointerCleanupRenderer?.dispose();
  pointerCleanupRenderer = undefined;
  pointerCleanupTarget?.remove();
  pointerCleanupTarget = undefined;
  pointerCleanupOriginalGetScreenCTM = undefined;
  pointerCleanupOriginalReleasePointerCapture = undefined;
  pointerCleanupReleaseError = undefined;
};

globalThis.__cflowRendererSvgTicket09InputFaults = async (): Promise<InputFaultResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const firstError = new Error('first input listener failed');
  const secondError = new Error('second input listener failed');
  const order: string[] = [];
  let browserError: unknown;
  let errorEventCount = 0;
  const handleError = (event: ErrorEvent): void => {
    errorEventCount += 1;
    browserError = event.error;
    event.preventDefault();
  };
  window.addEventListener('error', handleError);
  const stops = [
    renderer.subscribeInput((input) => {
      order.push(`first:${input.type}`);
      if (input.type !== 'pointer.down') return;
      target.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: input.pointerId,
          pointerType: 'mouse',
          clientX: 20,
          clientY: 30,
          bubbles: true,
        }),
      );
      throw firstError;
    }),
    renderer.subscribeInput((input) => {
      order.push(`second:${input.type}`);
      if (input.type === 'pointer.down') throw secondError;
    }),
    renderer.subscribeInput((input) => order.push(`third:${input.type}`)),
  ];
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 8,
      pointerType: 'mouse',
      clientX: 10,
      clientY: 20,
      button: 0,
      buttons: 1,
      bubbles: true,
    }),
  );
  await Promise.resolve();
  window.removeEventListener('error', handleError);
  for (const stop of stops) {
    stop();
    stop();
  }
  const aggregateErrors = browserError instanceof AggregateError ? browserError.errors : [];
  const result: InputFaultResult = {
    order,
    errorEventCount,
    aggregateName: browserError instanceof Error ? browserError.name : null,
    aggregateErrorCount: aggregateErrors.length,
    includesFirstError: aggregateErrors.includes(firstError),
    includesSecondError: aggregateErrors.includes(secondError),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket10DisposeLifecycle = async (): Promise<DisposeLifecycleResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  target.setAttribute('tabindex', '7');
  const callerDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  callerDefs.setAttribute('data-caller-owned', '');
  target.append(callerDefs);
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  let inputCount = 0;
  renderer.subscribeInput(() => {
    inputCount += 1;
  });
  const activeDuplicate = captureRendererError(() => createSvgRenderer({ target }));
  const firstDispose = renderer.dispose();
  const secondDispose = renderer.dispose();
  const staleUpdate = captureRendererError(() => renderer.updateDocument({ type: 'reset', view: kernel.read() }));
  const staleFocus = captureRendererError(() => renderer.focus());
  const staleSubscribe = captureRendererError(() => renderer.subscribeInput(() => undefined));
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 50,
      pointerType: 'mouse',
      clientX: 10,
      clientY: 20,
      button: 0,
      buttons: 1,
      bubbles: true,
    }),
  );
  const cleanupWindowDuplicate = captureRendererError(() => createSvgRenderer({ target }));
  await firstDispose;
  let targetReusable = false;
  const replacement = createSvgRenderer({ target });
  targetReusable = true;
  await replacement.dispose();
  const result: DisposeLifecycleResult = {
    activeDuplicate,
    cleanupWindowDuplicate,
    sameDisposePromise: firstDispose === secondDispose,
    staleUpdate,
    staleFocus,
    staleSubscribe,
    inputsAfterDisposeCall: inputCount,
    callerContentPreserved: target.querySelector(':scope > defs[data-caller-owned]') === callerDefs,
    projectionRemoved: target.querySelector(':scope > [data-cflow-renderer-svg-root]') === null,
    tabIndexPreserved: target.getAttribute('tabindex'),
    targetReusable,
  };
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket10DisposeFailure = async (): Promise<DisposeFailureResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const projection = target.querySelector<SVGGElement>(':scope > [data-cflow-renderer-svg-root]');
  if (!projection) throw new Error('Expected Projection for cleanup failure.');
  const listenerError = new Error('listener cleanup failed');
  const projectionError = new Error('projection cleanup failed');
  const originalRemoveEventListener = target.removeEventListener;
  let rejectFirstListenerRemoval = true;
  target.removeEventListener = function removeEventListener(
    ...arguments_: Parameters<EventTarget['removeEventListener']>
  ): void {
    if (rejectFirstListenerRemoval) {
      rejectFirstListenerRemoval = false;
      throw listenerError;
    }
    originalRemoveEventListener.apply(this, arguments_);
  };
  const originalProjectionRemove = projection.remove;
  projection.remove = function remove(): void {
    throw projectionError;
  };
  let caught: unknown;
  try {
    await renderer.dispose();
  } catch (error) {
    caught = error;
  } finally {
    target.removeEventListener = originalRemoveEventListener;
    projection.remove = originalProjectionRemove;
  }
  const aggregateErrors = caught instanceof AggregateError ? caught.errors : [];
  const reservationError = captureRendererError(() => createSvgRenderer({ target }));
  const result: DisposeFailureResult = {
    aggregateName: caught instanceof Error ? caught.name : null,
    aggregateMessage: caught instanceof Error ? caught.message : null,
    aggregateErrorCount: aggregateErrors.length,
    includesListenerError: aggregateErrors.includes(listenerError),
    includesProjectionError: aggregateErrors.includes(projectionError),
    tabIndexRestored: !target.hasAttribute('tabindex'),
    projectionRetained: target.contains(projection),
    reservationError,
  };
  originalProjectionRemove.call(projection);
  target.removeAttribute('tabindex');
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgTicket11RuntimeIntegration = async (): Promise<RuntimeIntegrationResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  let runtimeRenderer: RendererService | undefined;
  let providerRenderer: CanvasRenderer | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, session: sessionService, renderer: rendererService },
    setup(context) {
      kernel = context.services.kernel;
      session = context.services.session;
      runtimeRenderer = context.services.renderer;
    },
  });
  const faults: DiagnosticFault[] = [];
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const rendererPlugin = createRendererPlugin((config: Readonly<SvgRendererConfig>) => {
    providerRenderer = createSvgRenderer(config);
    return providerRenderer;
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(sessionPlugin),
    host.install(rendererPlugin, { target }),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !session || !runtimeRenderer || !providerRenderer) {
    throw new Error('Expected real Renderer Runtime Services.');
  }
  const initialNodeCount = target.querySelectorAll('[data-cflow-node-id]').length;
  const id = nodeId('runtime-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 20 },
      data: null,
    });
  });
  session.setSelection({ nodeIds: [id], edgeIds: [] });
  session.setViewport({ x: 10, y: 20, zoom: 2 });
  const node = target.querySelector<SVGRectElement>('[data-cflow-node-id="runtime-node"]');
  if (!node) throw new Error('Expected Runtime-projected Node.');
  runtimeRenderer.focus();
  const forwardedInputs: RendererInput[] = [];
  const stopInput = runtimeRenderer.subscribeInput((input) => forwardedInputs.push(input));
  const targetBounds = target.getBoundingClientRect();
  target.dispatchEvent(
    new WheelEvent('wheel', {
      clientX: targetBounds.left + 20,
      clientY: targetBounds.top + 30,
      deltaX: 1,
      deltaY: 2,
      deltaMode: WheelEvent.DOM_DELTA_LINE,
      bubbles: true,
      cancelable: true,
    }),
  );
  const resultBeforeDispose = {
    initialNodeCount,
    node: {
      x: node.getAttribute('x'),
      selected: node.getAttribute('data-cflow-selected'),
    },
    transform: target.querySelector('.cflow-renderer-svg')?.getAttribute('transform') ?? null,
    hit: runtimeRenderer.hitTest({ x: 20, y: 30 }),
    activeAfterFocus: document.activeElement === target,
    forwardedInput: forwardedInputs[0] ?? null,
  };
  session.setSelection({ nodeIds: [], edgeIds: [] });
  providerRenderer.updateDocument({ type: 'reset', view: createCanvasKernel().read() });
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('runtime-second-node'),
      type: 'task',
      position: { x: 100, y: 50 },
      size: { width: 60, height: 30 },
      data: null,
    });
  });
  const resyncedNodeIds = Array.from(target.querySelectorAll('[data-cflow-node-id]'), (element) =>
    element.getAttribute('data-cflow-node-id'),
  );
  stopInput();
  await host.dispose();
  const result: RuntimeIntegrationResult = {
    ...resultBeforeDispose,
    resyncedNodeIds,
    syncFaultCodes: faults.map((fault) => (fault.error as Readonly<{ code?: unknown }>).code),
    projectionRemoved: target.querySelector('[data-cflow-renderer-svg-root]') === null,
    staleService: captureRendererError(() => runtimeRenderer?.focus()),
  };
  target.remove();
  return result;
};

let runtimeCaptureHost: ReturnType<typeof createPluginHost> | undefined;
let runtimeCaptureTarget: SVGSVGElement | undefined;
let runtimeCaptureDestination: HTMLDivElement | undefined;
let stopRuntimeCaptureInput: (() => void) | undefined;
let runtimeCapturePointerId: number | undefined;
let runtimeCapturedThroughService = false;
let runtimeSawOutsideMove = false;
let runtimeCapturedDuringUp = false;
let runtimeReleasedThroughService = false;

globalThis.__cflowRendererSvgTicket11SetupRuntimeCapture = async (): Promise<void> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.id = 'ticket-11-runtime-capture-target';
  target.setAttribute('width', '200');
  target.setAttribute('height', '200');
  target.style.position = 'fixed';
  target.style.left = '0';
  target.style.top = '0';
  target.style.zIndex = '1000';
  const surface = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  surface.setAttribute('width', '200');
  surface.setAttribute('height', '200');
  surface.setAttribute('fill', 'transparent');
  target.append(surface);
  const destination = document.createElement('div');
  destination.style.position = 'fixed';
  destination.style.left = '320px';
  destination.style.top = '0';
  destination.style.width = '100px';
  destination.style.height = '100px';
  document.body.append(target, destination);

  let runtimeRenderer: RendererService | undefined;
  const consumer = definePlugin({
    requires: { renderer: rendererService },
    setup(context) {
      runtimeRenderer = context.services.renderer;
    },
  });
  const host = createPluginHost();
  const rendererPlugin = createRendererPlugin((config: Readonly<SvgRendererConfig>) => createSvgRenderer(config));
  const installations = [
    host.install(kernelPlugin),
    host.install(sessionPlugin),
    host.install(rendererPlugin, { target }),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!runtimeRenderer) throw new Error('Expected the Runtime Renderer Service for Pointer Capture.');
  const service = runtimeRenderer;

  runtimeCapturePointerId = undefined;
  runtimeCapturedThroughService = false;
  runtimeSawOutsideMove = false;
  runtimeCapturedDuringUp = false;
  runtimeReleasedThroughService = false;
  stopRuntimeCaptureInput = service.subscribeInput((input) => {
    if (input.type === 'pointer.down') {
      runtimeCapturePointerId = input.pointerId;
      service.capturePointer(input.pointerId);
      service.capturePointer(input.pointerId);
      runtimeCapturedThroughService = target.hasPointerCapture(input.pointerId);
    } else if (input.type === 'pointer.move' && input.screenPoint.x > 200) {
      runtimeSawOutsideMove = true;
    } else if (input.type === 'pointer.up') {
      runtimeCapturedDuringUp = target.hasPointerCapture(input.pointerId);
      service.releasePointer(input.pointerId);
      service.releasePointer(input.pointerId);
      runtimeReleasedThroughService = !target.hasPointerCapture(input.pointerId);
    }
  });
  runtimeCaptureHost = host;
  runtimeCaptureTarget = target;
  runtimeCaptureDestination = destination;
};

globalThis.__cflowRendererSvgTicket11ReadRuntimeCapture = (): RuntimeCaptureResult => ({
  capturedThroughService: runtimeCapturedThroughService,
  sawOutsideMove: runtimeSawOutsideMove,
  capturedDuringUp: runtimeCapturedDuringUp,
  releasedThroughService: runtimeReleasedThroughService,
  capturedAfterUp:
    runtimeCapturePointerId === undefined
      ? false
      : runtimeCaptureTarget?.hasPointerCapture(runtimeCapturePointerId) === true,
});

globalThis.__cflowRendererSvgTicket11TeardownRuntimeCapture = async (): Promise<void> => {
  stopRuntimeCaptureInput?.();
  stopRuntimeCaptureInput = undefined;
  await runtimeCaptureHost?.dispose();
  runtimeCaptureHost = undefined;
  runtimeCaptureDestination?.remove();
  runtimeCaptureDestination = undefined;
  runtimeCaptureTarget?.remove();
  runtimeCaptureTarget = undefined;
};

globalThis.__cflowRendererSvgReviewTargetAtomicCommit = async (): Promise<TargetAtomicCommitResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('target-atomic-node');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 40 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected Target atomicity Commit.');
  target.setAttribute('width', '0');
  const error = captureRendererError(() => renderer.updateDocument({ type: 'commit', commit }));
  const xAfterRejection = target.querySelector('[data-cflow-node-id="target-atomic-node"]')?.getAttribute('x') ?? null;
  target.setAttribute('width', '400');
  renderer.updateDocument({ type: 'commit', commit });
  const result: TargetAtomicCommitResult = {
    error,
    xAfterRejection,
    recoveredX: target.querySelector('[data-cflow-node-id="target-atomic-node"]')?.getAttribute('x') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewOperationRefresh = async (): Promise<OperationRefreshResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  target.style.transformOrigin = '0 0';
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const projection = target.querySelector('.cflow-renderer-svg');
  const before = projection?.getAttribute('transform') ?? null;
  target.style.transform = 'scale(2)';
  renderer.hitTest({ x: 10, y: 10 });
  const afterHitTest = projection?.getAttribute('transform') ?? null;
  target.style.transform = 'scale(4)';
  target.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId: 71,
      pointerType: 'mouse',
      clientX: target.getBoundingClientRect().left + 10,
      clientY: target.getBoundingClientRect().top + 10,
      bubbles: true,
    }),
  );
  const result: OperationRefreshResult = {
    before,
    afterHitTest,
    afterInput: projection?.getAttribute('transform') ?? null,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewOwnerRealm = async (): Promise<OwnerRealmResult> => {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  await new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true });
    frame.srcdoc = '<!doctype html><html><body><svg id="target" width="200" height="100"></svg></body></html>';
  });
  const target = frame.contentDocument?.querySelector<SVGSVGElement>('#target');
  if (!target) throw new Error('Expected iframe SVG Target.');
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('iframe-node'),
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  const result: OwnerRealmResult = {
    nodeId: target.querySelector('[data-cflow-node-id]')?.getAttribute('data-cflow-node-id') ?? null,
    projectionClass: target.querySelector('[data-cflow-renderer-svg-root]')?.getAttribute('class') ?? null,
  };
  await renderer.dispose();
  frame.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewUnknownConfig = async (): Promise<UnknownConfigResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const root = captureRendererError(() =>
    createSvgRenderer({ target, surprise: true } as unknown as SvgRendererConfig),
  );
  const input = captureRendererError(() =>
    createSvgRenderer({ target, input: { surprise: {} } } as unknown as SvgRendererConfig),
  );
  const policy = captureRendererError(() =>
    createSvgRenderer({
      target,
      input: { pointer: { preventDefault: false, surprise: true } },
    } as unknown as SvgRendererConfig),
  );
  const result: UnknownConfigResult = {
    root,
    input,
    policy,
    targetUnchanged:
      !target.hasAttribute('tabindex') && target.querySelector('[data-cflow-renderer-svg-root]') === null,
  };
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewMalformedUpdates = async (): Promise<MalformedUpdateResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const projectionBefore = target.querySelector('[data-cflow-renderer-svg-root]')?.innerHTML;
  const update = renderer.updateDocument as unknown as (value: unknown) => void;
  const nullUpdate = captureRendererError(() => update(null));
  const invalidQuery = captureRendererError(() =>
    update({
      type: 'reset',
      view: {
        snapshot: { revision: 0, nodes: [], edges: [] },
        query: {},
      },
    }),
  );
  const nullCommit = captureRendererError(() => update({ type: 'commit', commit: null }));
  const result: MalformedUpdateResult = {
    nullUpdate,
    invalidQuery,
    nullCommit,
    projectionUnchanged: target.querySelector('[data-cflow-renderer-svg-root]')?.innerHTML === projectionBefore,
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewMalformedChangeEvidence = async (): Promise<MalformedChangeEvidenceResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const sourceId = nodeId('malformed-source');
  const targetId = nodeId('malformed-target');
  const connectionId = edgeId('malformed-edge');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: undefined,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'task',
      position: { x: 200, y: 100 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: connectionId,
      type: 'straight',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: undefined,
    });
  });
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(sourceId, {
      id: sourceId,
      type: 'task',
      position: { x: 30, y: 20 },
      size: { width: 80, height: 40 },
      data: undefined,
    });
    transaction.edges.replace(connectionId, {
      id: connectionId,
      type: 'updated-straight',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: undefined,
    });
  });
  if (!commit) throw new Error('Expected a malformed-evidence baseline Commit.');
  const nodeChange = commit.changeSet.changes.find((change) => change.entity === 'node');
  const edgeChange = commit.changeSet.changes.find((change) => change.entity === 'edge');
  if (!nodeChange?.after || !edgeChange?.after) {
    throw new Error('Expected Node and Edge evidence in the malformed-evidence Commit.');
  }
  const update = renderer.updateDocument as unknown as (value: unknown) => void;
  const attempt = (forgedCommit: unknown): MalformedCommitAttemptResult => {
    renderer.updateDocument({ type: 'reset', view: commit.before });
    const projectionBefore = target.querySelector('[data-cflow-renderer-svg-root]')?.innerHTML;
    const error = captureRendererError(() => update({ type: 'commit', commit: forgedCommit }));
    const projectionUnchanged = target.querySelector('[data-cflow-renderer-svg-root]')?.innerHTML === projectionBefore;
    renderer.updateDocument({ type: 'commit', commit });
    return {
      error,
      projectionUnchanged,
      recoveredX: target.querySelector('[data-cflow-node-id="malformed-source"]')?.getAttribute('x') ?? null,
    };
  };
  const replaceChange = (original: typeof nodeChange | typeof edgeChange, replacement: unknown) =>
    commit.changeSet.changes.map((change) => (change === original ? replacement : change));
  const nodeWithoutData = { ...nodeChange.after } as Record<string, unknown>;
  delete nodeWithoutData.data;
  const edgeWithoutData = { ...edgeChange.after } as Record<string, unknown>;
  delete edgeWithoutData.data;
  const forgeChanges = (changes: readonly unknown[]) => ({
    ...commit,
    changeSet: { ...commit.changeSet, changes },
  });
  const result: MalformedChangeEvidenceResult = {
    nodePosition: attempt(
      forgeChanges(replaceChange(nodeChange, { ...nodeChange, after: { ...nodeChange.after, position: null } })),
    ),
    edgeSource: attempt(
      forgeChanges(replaceChange(edgeChange, { ...edgeChange, after: { ...edgeChange.after, source: null } })),
    ),
    missingNodeData: attempt(forgeChanges(replaceChange(nodeChange, { ...nodeChange, after: nodeWithoutData }))),
    missingEdgeData: attempt(forgeChanges(replaceChange(edgeChange, { ...edgeChange, after: edgeWithoutData }))),
    emptyChanges: attempt({
      ...commit,
      after: {
        snapshot: { ...commit.before.snapshot, revision: commit.after.snapshot.revision },
        query: commit.after.query,
      },
      changeSet: { ...commit.changeSet, changes: [] },
    }),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewCommitSessionRollback = async (): Promise<CommitSessionRollbackResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const id = nodeId('commit-session-rollback');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(id, {
      id,
      type: 'task',
      position: { x: 30, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected a Commit for Session rollback.');
  const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
  const element = target.querySelector<SVGRectElement>('[data-cflow-node-id="commit-session-rollback"]');
  if (!projection || !element) throw new Error('Expected the Session rollback Projection.');
  const originalGetScreenCTM = target.getScreenCTM;
  const originalGetBoundingClientRect = target.getBoundingClientRect;
  target.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON() {} }) as DOMRect;
  target.getScreenCTM = () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) as ReturnType<SVGSVGElement['getScreenCTM']>;
  const injected = new Error('injected Session projection failure');
  const originalSetAttribute = projection.setAttribute;
  let throwOnce = true;
  projection.setAttribute = function setAttribute(name: string, value: string): void {
    if (name === 'transform' && throwOnce) {
      throwOnce = false;
      throw injected;
    }
    originalSetAttribute.call(this, name, value);
  };
  let caught: unknown;
  try {
    renderer.updateDocument({ type: 'commit', commit });
  } catch (error) {
    caught = error;
  } finally {
    projection.setAttribute = originalSetAttribute;
  }
  const rollbackX = element.getAttribute('x');
  const rollbackTransform = projection.getAttribute('transform');
  renderer.updateDocument({ type: 'commit', commit });
  const result: CommitSessionRollbackResult = {
    sameErrorIdentity: caught === injected,
    rollbackX,
    rollbackTransform,
    recoveredX: element.getAttribute('x'),
    recoveredTransform: projection.getAttribute('transform'),
  };
  target.getScreenCTM = originalGetScreenCTM;
  target.getBoundingClientRect = originalGetBoundingClientRect;
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewResetAtomicity = async (): Promise<ResetAtomicityResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  const sourceId = nodeId('reset-source');
  const targetId = nodeId('reset-target');
  const connectionId = edgeId('reset-edge');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'task',
      position: { x: 200, y: 100 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: connectionId,
      type: 'straight',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });
  });
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({
    selection: { nodeIds: [sourceId], edgeIds: [] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(sourceId, {
      id: sourceId,
      type: 'task',
      position: { x: 30, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.replace(connectionId, {
      id: connectionId,
      type: 'updated-straight',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });
  });
  if (!commit) throw new Error('Expected a Reset atomicity Commit.');
  const nodesLayer = target.querySelector<SVGGElement>('.cflow-renderer-svg__nodes');
  const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
  const initialNode = target.querySelector('[data-cflow-node-id="reset-source"]');
  const initialEdge = target.querySelector('[data-cflow-edge-id="reset-edge"]');
  if (!nodesLayer || !projection || !initialNode || !initialEdge) {
    throw new Error('Expected the initial Reset atomicity Projection.');
  }
  const layerError = new Error('injected Reset layer failure');
  const originalReplaceChildren = nodesLayer.replaceChildren;
  let failLayerOnce = true;
  nodesLayer.replaceChildren = function replaceChildren(...nodes: (Node | string)[]): void {
    if (failLayerOnce) {
      failLayerOnce = false;
      throw layerError;
    }
    originalReplaceChildren.call(this, ...nodes);
  };
  let caughtLayer: unknown;
  try {
    renderer.updateDocument({ type: 'reset', view: commit.after });
  } catch (error) {
    caughtLayer = error;
  } finally {
    nodesLayer.replaceChildren = originalReplaceChildren;
  }
  const layerNodeIdentityRestored = initialNode === target.querySelector('[data-cflow-node-id="reset-source"]');
  const layerEdgeIdentityRestored = initialEdge === target.querySelector('[data-cflow-edge-id="reset-edge"]');
  const layerRollbackX = initialNode.getAttribute('x');
  renderer.updateDocument({ type: 'commit', commit });
  const layerRecoveredX = initialNode.getAttribute('x');

  renderer.updateDocument({ type: 'reset', view: commit.before });
  const sessionBaselineNode = target.querySelector('[data-cflow-node-id="reset-source"]');
  if (!sessionBaselineNode) throw new Error('Expected the Session Reset baseline Node.');
  const originalGetScreenCTM = target.getScreenCTM;
  const originalGetBoundingClientRect = target.getBoundingClientRect;
  target.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON() {} }) as DOMRect;
  target.getScreenCTM = () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) as ReturnType<SVGSVGElement['getScreenCTM']>;
  const sessionError = new Error('injected Reset Session failure');
  const originalProjectionSetAttribute = projection.setAttribute;
  let failSessionOnce = true;
  projection.setAttribute = function setAttribute(name: string, value: string): void {
    if (name === 'transform' && failSessionOnce) {
      failSessionOnce = false;
      throw sessionError;
    }
    originalProjectionSetAttribute.call(this, name, value);
  };
  let caughtSession: unknown;
  try {
    renderer.updateDocument({ type: 'reset', view: commit.after });
  } catch (error) {
    caughtSession = error;
  } finally {
    projection.setAttribute = originalProjectionSetAttribute;
  }
  const sessionNodeIdentityRestored =
    sessionBaselineNode === target.querySelector('[data-cflow-node-id="reset-source"]');
  const sessionRollbackX = sessionBaselineNode.getAttribute('x');
  const sessionRollbackTransform = projection.getAttribute('transform');
  renderer.updateDocument({ type: 'commit', commit });
  const result: ResetAtomicityResult = {
    layerSameErrorIdentity: caughtLayer === layerError,
    layerNodeIdentityRestored,
    layerEdgeIdentityRestored,
    layerRollbackX,
    layerRecoveredX,
    sessionSameErrorIdentity: caughtSession === sessionError,
    sessionNodeIdentityRestored,
    sessionRollbackX,
    sessionRollbackTransform,
    sessionRecoveredX: target.querySelector('[data-cflow-node-id="reset-source"]')?.getAttribute('x') ?? null,
    sessionRecoveredTransform: projection.getAttribute('transform'),
  };
  target.getScreenCTM = originalGetScreenCTM;
  target.getBoundingClientRect = originalGetBoundingClientRect;
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewResizeObserverError = async (): Promise<ResizeObserverErrorResult> => {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '200');
  target.setAttribute('viewBox', '0 0 200 100');
  target.setAttribute('preserveAspectRatio', 'none');
  document.body.append(target);
  const renderer = createSvgRenderer({ target });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  const session = {
    selection: { nodeIds: [], edgeIds: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  } as const;
  renderer.updateSession(session);
  const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
  if (!projection) throw new Error('Expected the ResizeObserver error Projection.');
  const injected = new Error('injected ResizeObserver DOM failure');
  const originalSetAttribute = projection.setAttribute;
  let throwOnce = true;
  projection.setAttribute = function setAttribute(name: string, value: string): void {
    if (name === 'transform' && throwOnce) {
      throwOnce = false;
      throw injected;
    }
    originalSetAttribute.call(this, name, value);
  };
  target.setAttribute('width', '200');
  await nextRenderFrames();
  projection.setAttribute = originalSetAttribute;
  const rollbackTransform = projection.getAttribute('transform');
  target.setAttribute('width', '300');
  await nextRenderFrames();
  const successfulResizeTransform = projection.getAttribute('transform');
  let caught: unknown;
  try {
    renderer.updateSession(session);
  } catch (error) {
    caught = error;
  }
  renderer.updateSession(session);
  const result: ResizeObserverErrorResult = {
    sameErrorIdentity: caught === injected,
    rollbackTransform,
    successfulResizeTransform,
    recoveredTransform: projection.getAttribute('transform'),
  };
  await renderer.dispose();
  target.remove();
  return result;
};

globalThis.__cflowRendererSvgReviewResizeObserverRollbackFailure =
  async (): Promise<ResizeObserverRollbackFailureResult> => {
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    target.setAttribute('width', '400');
    target.setAttribute('height', '200');
    target.setAttribute('viewBox', '0 0 200 100');
    target.setAttribute('preserveAspectRatio', 'none');
    document.body.append(target);
    const renderer = createSvgRenderer({ target });
    const kernel = createCanvasKernel();
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    const session = {
      selection: { nodeIds: [], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    } as const;
    renderer.updateSession(session);
    await nextRenderFrames();
    const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
    if (!projection) throw new Error('Expected the ResizeObserver rollback-failure Projection.');
    const primaryError = new Error('injected ResizeObserver primary failure');
    const rollbackError = new Error('injected ResizeObserver rollback failure');
    const originalSetAttribute = projection.setAttribute;
    let transformWriteCount = 0;
    projection.setAttribute = function setAttribute(name: string, value: string): void {
      if (name === 'transform') {
        transformWriteCount += 1;
        if (transformWriteCount === 1) throw primaryError;
        if (transformWriteCount === 2) throw rollbackError;
      }
      originalSetAttribute.call(this, name, value);
    };
    target.setAttribute('width', '200');
    await nextRenderFrames();
    projection.setAttribute = originalSetAttribute;

    let aggregate: unknown;
    try {
      renderer.updateSession(session);
    } catch (error) {
      aggregate = error;
    }
    const aggregateErrors = aggregate instanceof AggregateError ? aggregate.errors : [];
    const blockedSession = captureRendererError(() => renderer.updateSession(session));
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    renderer.updateSession(session);
    const result: ResizeObserverRollbackFailureResult = {
      aggregateName: aggregate instanceof Error ? aggregate.name : null,
      aggregateMessage: aggregate instanceof Error ? aggregate.message : null,
      aggregateErrorCount: aggregateErrors.length,
      includesPrimaryError: aggregateErrors.includes(primaryError),
      includesRollbackError: aggregateErrors.includes(rollbackError),
      blockedSession,
      recoveredTransform: projection.getAttribute('transform'),
    };
    await renderer.dispose();
    target.remove();
    return result;
  };

globalThis.__cflowRendererSvgReviewResizeObserverMultipleErrors =
  async (): Promise<ResizeObserverMultipleErrorsResult> => {
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    target.setAttribute('width', '400');
    target.setAttribute('height', '200');
    target.setAttribute('viewBox', '0 0 200 100');
    target.setAttribute('preserveAspectRatio', 'none');
    document.body.append(target);
    const renderer = createSvgRenderer({ target });
    const kernel = createCanvasKernel();
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    const session = {
      selection: { nodeIds: [], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    } as const;
    renderer.updateSession(session);
    await nextRenderFrames();
    const projection = target.querySelector<SVGGElement>('[data-cflow-renderer-svg-root]');
    if (!projection) throw new Error('Expected the multiple ResizeObserver error Projection.');
    const firstError = new Error('injected first ResizeObserver failure');
    const secondError = new Error('injected second ResizeObserver failure');
    const originalSetAttribute = projection.setAttribute;
    let failureIndex = 0;
    projection.setAttribute = function setAttribute(name: string, value: string): void {
      if (name === 'transform' && value !== 'matrix(0.5 0 0 0.5 0 0)' && failureIndex < 2) {
        const error = failureIndex === 0 ? firstError : secondError;
        failureIndex += 1;
        throw error;
      }
      originalSetAttribute.call(this, name, value);
    };
    target.setAttribute('width', '200');
    await nextRenderFrames();
    target.setAttribute('width', '300');
    await nextRenderFrames();
    projection.setAttribute = originalSetAttribute;

    let aggregate: unknown;
    try {
      renderer.updateSession(session);
    } catch (error) {
      aggregate = error;
    }
    const aggregateErrors = aggregate instanceof AggregateError ? aggregate.errors : [];
    renderer.updateSession(session);
    const result: ResizeObserverMultipleErrorsResult = {
      aggregateName: aggregate instanceof Error ? aggregate.name : null,
      aggregateMessage: aggregate instanceof Error ? aggregate.message : null,
      aggregateErrorCount: aggregateErrors.length,
      includesFirstError: aggregateErrors.includes(firstError),
      includesSecondError: aggregateErrors.includes(secondError),
      recoveredTransform: projection.getAttribute('transform'),
    };
    await renderer.dispose();
    target.remove();
    return result;
  };
