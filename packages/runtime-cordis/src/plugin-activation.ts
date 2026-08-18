import type { ChildInstaller, RuntimeContext, ServicePublisher } from './internal-contracts';
import type { OwnedResourceDisposer, PluginDefinition, ProvidedServices } from './plugin-contracts';
import { PluginHostError } from './plugin-host-error';
import { getServiceName, type BoundServices, type ServiceBindings } from './service-token';

export class PluginActivation<Config, Requires extends ServiceBindings, Provides extends ServiceBindings> {
  readonly controller = new AbortController();
  readonly resources: OwnedResourceDisposer[] = [];
  #disposal?: Promise<void>;
  #ended = false;

  constructor(
    private readonly definition: PluginDefinition<Config, Requires, Provides>,
    private readonly config: Config,
    private readonly installChild: ChildInstaller,
    private readonly publishService: ServicePublisher,
  ) {}

  async run(context: RuntimeContext): Promise<ProvidedServices<Provides>> {
    const services = Object.fromEntries(
      Object.entries(this.definition.requires ?? {}).map(([binding, token]) => [
        binding,
        context.get(getServiceName(token)),
      ]),
    ) as BoundServices<Requires>;
    try {
      return await this.definition.setup(
        {
          signal: this.controller.signal,
          services: Object.freeze(services),
          own: (dispose) => {
            this.#assertActive();
            this.resources.push(dispose);
          },
          install: (plugin, ...args) => {
            this.#assertActive();
            // A Child uses the Host installer, so it joins the same Plugin
            // Graph, while this resource entry binds it to the parent lifetime.
            const child = this.installChild(plugin, ...args);
            this.resources.push(() => child.dispose());
            return child;
          },
        },
        this.config,
      );
    } catch (error) {
      try {
        await this.dispose();
      } catch {
        // Preserve the setup error here; Installation.dispose() exposes the
        // cached cleanup AggregateError without asking Cordis to retain it.
      }
      throw error;
    }
  }

  dispose(): Promise<void> {
    if (!this.#disposal) {
      this.#ended = true;
      this.controller.abort();
      this.#disposal = (async () => {
        const errors: unknown[] = [];
        for (const dispose of this.resources.splice(0).reverse()) {
          try {
            await dispose();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length) {
          throw new AggregateError(errors, 'Plugin resource cleanup failed.');
        }
      })();
    }
    return this.#disposal;
  }

  publishProvidedServices(services: BoundServices<Provides>): OwnedResourceDisposer[] {
    return Object.entries(this.definition.provides ?? {}).map(([binding, token]) =>
      this.publishService(getServiceName(token), services[binding]),
    );
  }

  #assertActive(): void {
    if (this.#ended) {
      throw new PluginHostError('INSTALLATION_DISPOSED', 'Plugin Activation has ended.');
    }
  }
}
