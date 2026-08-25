import { createExampleRuntime, type ExampleRuntime } from './create-example-runtime';

export class RuntimeMountCoordinator {
  #tail: Promise<void> = Promise.resolve();
  #runtime: ExampleRuntime | undefined;

  mount(
    target: SVGSVGElement,
    onReady: (runtime: ExampleRuntime) => void,
    onError: (error: unknown) => void,
  ): () => void {
    let cancelled = false;
    this.#tail = this.#tail.then(async () => {
      if (cancelled) return;
      try {
        const runtime = await createExampleRuntime(target);
        if (cancelled) {
          await runtime.dispose();
          return;
        }
        this.#runtime = runtime;
        onReady(runtime);
      } catch (error) {
        onError(error);
      }
    });

    return () => {
      cancelled = true;
      this.#tail = this.#tail.then(async () => {
        const runtime = this.#runtime;
        this.#runtime = undefined;
        if (runtime) await runtime.dispose();
      });
    };
  }

  dispose(): Promise<void> {
    this.#tail = this.#tail.then(async () => {
      const runtime = this.#runtime;
      this.#runtime = undefined;
      if (runtime) await runtime.dispose();
    });
    return this.#tail;
  }
}

interface RuntimeHotData {
  runtimeMountCoordinator?: RuntimeMountCoordinator;
}

const hotData = import.meta.hot?.data as RuntimeHotData | undefined;
export const runtimeMountCoordinator = hotData?.runtimeMountCoordinator ?? new RuntimeMountCoordinator();

if (hotData) hotData.runtimeMountCoordinator = runtimeMountCoordinator;
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void runtimeMountCoordinator.dispose().catch((error) => {
      queueMicrotask(() => {
        throw error;
      });
    });
  });
}
