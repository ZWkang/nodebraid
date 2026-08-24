import { test } from 'bun:test';

import { createPluginHost } from '@nodebraid/runtime-cordis';

import { commandPlugin, defineCommand, type Command, type CommandService } from '../src';

test('keeps Command input and output types invariant', () => {
  const verifyTypes = (service: CommandService) => {
    const format = defineCommand<number, string>('number.format');
    service.register(format, (input) => input.toFixed(2));
    service.execute(format, 1);
    // @ts-expect-error Command input remains number.
    service.execute(format, '1');
    // @ts-expect-error A number result does not satisfy the Command output contract.
    service.register(format, (input) => input);
    // @ts-expect-error Input and output positions keep Command types invariant.
    const erased: Command<unknown, unknown> = format;
    // @ts-expect-error Command tokens cannot be structurally forged.
    const forged: Command<void, void> = { id: 'forged' };
    // @ts-expect-error Command IDs are readonly.
    format.id = 'changed';
    void erased;
    void forged;
  };
  const verifyPluginTypes = () => {
    const host = createPluginHost();
    host.install(commandPlugin);
    // @ts-expect-error The official Command Plugin has no configuration.
    host.install(commandPlugin, {});
  };
  void verifyTypes;
  void verifyPluginTypes;
});
