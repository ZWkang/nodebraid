import type { LayoutEngine, LayoutInputOptions, LayoutMode } from '@cflow/layout-api';
import type { Command } from '@cflow/plugin-command';
import type { KernelService } from '@cflow/plugin-kernel';

export type LayoutCommandResult = ReturnType<KernelService['transact']>;

export interface LayoutCommandInput<Config> {
  readonly mode: LayoutMode;
  readonly fixedNodeIds: LayoutInputOptions['fixedNodeIds'];
  readonly config: Config;
}

export interface CreateLayoutPluginOptions<Config> {
  readonly engine: LayoutEngine<Config>;
  readonly command: Command<LayoutCommandInput<Config>, LayoutCommandResult>;
}
