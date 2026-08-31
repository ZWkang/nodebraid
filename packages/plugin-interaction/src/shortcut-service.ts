import { defineService } from '@nodebraid/runtime-cordis';

import type { InteractionShortcutService } from './shortcut-contracts';

export const interactionShortcutService = defineService<InteractionShortcutService>('interaction.shortcuts');
