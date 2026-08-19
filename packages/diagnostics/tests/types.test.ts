import { test } from 'bun:test';

import type { DiagnosticEventInput, DiagnosticSink, FaultReporter, PluginDiagnostics } from '../src';

test('keeps the public Diagnostics seam narrow and immutable', () => {
  const verifyTypes = (diagnostics: PluginDiagnostics) => {
    const sink: DiagnosticSink = (event) => {
      void event.name;
      // @ts-expect-error Diagnostic Events are immutable.
      event.sequence = 2;
    };
    const reporter: FaultReporter = (fault) => {
      void fault.error;
      void fault.event.scope.hostId;
    };
    const input: DiagnosticEventInput = {
      name: 'example.ready',
      level: 'info',
      attributes: { count: 1 },
    };
    diagnostics.emit(input);
    diagnostics.reportFault(new Error('listener failed'), {
      name: 'example.listener.fault',
      attributes: { listener: 'canvas' },
    });
    diagnostics.reportFault(new Error('listener failed'), {
      name: 'example.listener.fault',
      // @ts-expect-error Fault level is fixed by reportFault.
      level: 'warn',
    });
    void sink;
    void reporter;
  };
  void verifyTypes;
});
