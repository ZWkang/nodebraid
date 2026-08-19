import { PluginHostError, type DependencyCycleErrorDetails } from './plugin-host-error';
import type { ServiceBindings, ServiceTokenBase } from './service-token';

export interface InstallationNode {
  readonly pluginName: string | undefined;
  readonly requires: ServiceBindings;
  readonly provides: ServiceBindings;
}

interface DependencyEdge {
  readonly consumer: InstallationNode;
  readonly provider: InstallationNode;
  readonly token: ServiceTokenBase;
}

export class PluginGraph {
  readonly #nodes = new Set<InstallationNode>();
  readonly #providerReservations = new Map<ServiceTokenBase, InstallationNode>();

  register(pluginName: string | undefined, requires: ServiceBindings, provides: ServiceBindings): InstallationNode {
    const node = { pluginName, requires, provides };
    const providedTokens = [...new Set(Object.values(provides))];
    for (const token of providedTokens) {
      const existing = this.#providerReservations.get(token);
      if (existing) {
        throw new PluginHostError(
          'PROVIDER_CONFLICT',
          `Plugin "${pluginName ?? '<anonymous>'}" cannot provide Service Token "${token.name}" because it is reserved by "${existing.pluginName ?? '<anonymous>'}".`,
          {
            type: 'provider-conflict',
            serviceName: token.name,
            existingProvider: existing.pluginName ?? '<anonymous>',
            conflictingProvider: pluginName ?? '<anonymous>',
          },
        );
      }
    }

    const candidateProviders = new Map(this.#providerReservations);
    for (const token of providedTokens) candidateProviders.set(token, node);
    const cycle = findDependencyCycle([...this.#nodes, node], candidateProviders);
    if (cycle) {
      throw new PluginHostError('DEPENDENCY_CYCLE', formatDependencyCycle(cycle), createDependencyCycleDetails(cycle));
    }

    this.#nodes.add(node);
    for (const token of providedTokens) this.#providerReservations.set(token, node);
    return node;
  }

  remove(node: InstallationNode): void {
    this.#nodes.delete(node);
    for (const token of new Set(Object.values(node.provides))) {
      if (this.#providerReservations.get(token) === node) {
        this.#providerReservations.delete(token);
      }
    }
  }
}

function findDependencyCycle(
  nodes: readonly InstallationNode[],
  providers: ReadonlyMap<ServiceTokenBase, InstallationNode>,
): readonly DependencyEdge[] | undefined {
  const visiting = new Set<InstallationNode>();
  const visited = new Set<InstallationNode>();
  const nodeStack: InstallationNode[] = [];
  const edgeStack: DependencyEdge[] = [];

  const visit = (node: InstallationNode): readonly DependencyEdge[] | undefined => {
    visiting.add(node);
    nodeStack.push(node);

    for (const token of Object.values(node.requires)) {
      const provider = providers.get(token);
      if (!provider) continue;
      const edge = { consumer: node, provider, token };
      if (visiting.has(provider)) {
        const cycleStart = nodeStack.indexOf(provider);
        return [...edgeStack.slice(cycleStart), edge];
      }
      if (visited.has(provider)) continue;
      edgeStack.push(edge);
      const cycle = visit(provider);
      if (cycle) return cycle;
      edgeStack.pop();
    }

    nodeStack.pop();
    visiting.delete(node);
    visited.add(node);
    return undefined;
  };

  for (const node of nodes) {
    if (visited.has(node)) continue;
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return undefined;
}

function formatDependencyCycle(cycle: readonly DependencyEdge[]): string {
  let path = `"${cycle[0]!.consumer.pluginName ?? '<anonymous>'}"`;
  for (const edge of cycle) {
    path += ` --[${edge.token.name}]--> "${edge.provider.pluginName ?? '<anonymous>'}"`;
  }
  return `Plugin dependency cycle: ${path}.`;
}

function createDependencyCycleDetails(cycle: readonly DependencyEdge[]): DependencyCycleErrorDetails {
  return Object.freeze({
    type: 'dependency-cycle',
    path: Object.freeze(
      cycle.map((edge) =>
        Object.freeze({
          plugin: edge.consumer.pluginName ?? '<anonymous>',
          serviceName: edge.token.name,
          provider: edge.provider.pluginName ?? '<anonymous>',
        }),
      ),
    ),
  });
}
