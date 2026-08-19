import { applyChangeSetToDraft } from './change-set';
import { createCanvasView } from './canvas-view';
import type {
  CanvasCommit,
  CanvasEdge,
  CanvasKernel,
  CanvasNode,
  ChangeDirection,
  ChangeSet,
  EntityWriter,
  GraphChange,
  TransactionContext,
  TransactionMetadata,
} from './contracts';
import { collectEntityChanges, createEntityWriter } from './entity-collection';
import { canvasEdgesEqual, canvasNodesEqual, freezeCanvasEdge, freezeCanvasNode } from './entity-values';
import { createCanvasQuery, GraphIndex } from './graph-index';
import { describeGraphIssues, validateGraph } from './graph-validation';
import type { EdgeId, NodeId } from './identifiers';
import { KernelError } from './kernel-error';
import { incrementRevision } from './revision';

/** Creates one empty revision-zero Document with no Runtime or Renderer lifecycle attached. */
export function createCanvasKernel(): CanvasKernel {
  let nodes = new Map<NodeId, CanvasNode>();
  let edges = new Map<EdgeId, CanvasEdge>();
  let view = createCanvasView(0, nodes, edges);
  let transactionActive = false;

  return Object.freeze({
    read: () => view,
    transact(callback: (transaction: TransactionContext) => void, metadata?: TransactionMetadata): CanvasCommit | null {
      if (transactionActive) {
        throw new KernelError(
          'TRANSACTION_REENTRANT',
          'A Transaction is already active for this Kernel.',
          Object.freeze({}),
        );
      }
      const before = view;
      // The committed Maps are never mutated. A callback sees only these private Draft copies.
      const draftNodes = new Map(nodes);
      const draftEdges = new Map(edges);
      const draftIndex = new GraphIndex(draftNodes, draftEdges);
      const touchedNodeIds = new Set<NodeId>();
      const touchedEdgeIds = new Set<EdgeId>();
      let transactionOpen = true;
      const assertTransactionOpen = (): void => {
        if (!transactionOpen) {
          throw new KernelError('TRANSACTION_CLOSED', 'Transaction Context is closed.', Object.freeze({}));
        }
      };
      const query = createCanvasQuery(draftNodes, draftEdges, draftIndex, assertTransactionOpen);
      const nodeWriter: EntityWriter<NodeId, CanvasNode> = createEntityWriter({
        kind: 'node',
        draft: draftNodes,
        touchedIds: touchedNodeIds,
        freeze: freezeCanvasNode,
        assertOpen: assertTransactionOpen,
        onAdd: (node) => draftIndex.addNode(node),
        onReplace: (oldNode, newNode) => draftIndex.replaceNode(oldNode, newNode),
        onRemove: (node) => draftIndex.removeNode(node),
      });
      const edgeWriter: EntityWriter<EdgeId, CanvasEdge> = createEntityWriter({
        kind: 'edge',
        draft: draftEdges,
        touchedIds: touchedEdgeIds,
        freeze: freezeCanvasEdge,
        assertOpen: assertTransactionOpen,
        onAdd: (edge) => draftIndex.addEdge(edge),
        onReplace: (oldEdge, newEdge) => draftIndex.replaceEdge(oldEdge, newEdge),
        onRemove: (edge) => draftIndex.removeEdge(edge),
      });
      const transaction: TransactionContext = Object.freeze({
        query,
        nodes: nodeWriter,
        edges: edgeWriter,
        applyChangeSet(changeSet: ChangeSet, direction: ChangeDirection): void {
          assertTransactionOpen();
          applyChangeSetToDraft(changeSet, direction, draftNodes, draftEdges, nodeWriter, edgeWriter);
        },
      });

      let callbackResult: unknown;
      transactionActive = true;
      try {
        callbackResult = callback(transaction);
      } finally {
        // Capabilities close even when user code throws, preventing a leaked Draft from escaping atomicity.
        transactionOpen = false;
        transactionActive = false;
      }
      if (isThenable(callbackResult)) {
        throw new KernelError(
          'ASYNC_TRANSACTION',
          'Transaction callback must complete synchronously.',
          Object.freeze({}),
        );
      }

      // Intermediate states may be incomplete; only the final Draft is subject to structural validation.
      const issues = validateGraph(draftNodes, draftEdges);
      if (issues.length > 0) {
        throw new KernelError(
          'INVALID_GRAPH',
          'The final graph is invalid.',
          Object.freeze({ issues: describeGraphIssues(issues) }),
        );
      }
      // Coalesce repeated writes into the original before and final after values, dropping net-zero entries.
      const nodeChanges = collectEntityChanges('node', nodes, draftNodes, touchedNodeIds, canvasNodesEqual);
      const edgeChanges = collectEntityChanges('edge', edges, draftEdges, touchedEdgeIds, canvasEdgesEqual);
      const changes: readonly GraphChange[] = Object.freeze([...nodeChanges, ...edgeChanges]);
      if (changes.length === 0) return null;

      const revision = incrementRevision(before.snapshot.revision);
      if (revision === null) {
        throw new KernelError(
          'REVISION_OVERFLOW',
          'Kernel revision cannot exceed Number.MAX_SAFE_INTEGER.',
          Object.freeze({ revision: before.snapshot.revision }),
        );
      }
      // This assignment is the single authoritative commit point.
      nodes = draftNodes;
      edges = draftEdges;
      view = createCanvasView(revision, nodes, edges);
      const changeSet: ChangeSet = Object.freeze({
        beforeRevision: before.snapshot.revision,
        revision,
        ...(metadata?.origin === undefined ? {} : { origin: metadata.origin }),
        ...(metadata?.commandId === undefined ? {} : { commandId: metadata.commandId }),
        changes,
      });

      return Object.freeze({ before, after: view, changeSet });
    },
  });
}

function isThenable(value: unknown): boolean {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return false;
  // Async functions are assignable to a void callback in TypeScript, so the runtime guard is intentional.
  return typeof Reflect.get(value, 'then') === 'function';
}
