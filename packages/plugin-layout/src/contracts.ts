import type { LayoutEngine, LayoutInputOptions, LayoutMode } from '@nodebraid/layout-api';
import type { Command } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';

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
