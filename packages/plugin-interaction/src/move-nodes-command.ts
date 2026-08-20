import { defineCommand } from '@cflow/plugin-command';

import type { MoveNodesInput, MoveNodesResult } from './contracts';

export const moveNodesCommand = defineCommand<MoveNodesInput, MoveNodesResult>('interaction.nodes.move');
