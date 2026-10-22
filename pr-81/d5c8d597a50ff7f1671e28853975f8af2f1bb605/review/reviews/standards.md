What this change does: Runtime diagnostics retains the Host ID and Event fields it validates. Fault reporting also captures its name once, so invalid attributes or field-read errors cannot cause another name read while constructing failure context.

Verdict: passed.

Reviewed identity:

- Base: 710038f0ed0cfc830580241ca1e90fca5f50677e
- Head: 9a188bfe2cdd34ec3d95a075ade752dc9ac3c97c
- Tree: 0747337c09e331739d840a875e3065efdbeed6f2
- Binary patch SHA256: e21467a1cc71cf2f808cc8004fbf9462cfbaf0e8aac02db1115c4ef75927fa4e

Hard standards: No remaining violations found in the complete two-file patch. AGENTS.md and CONTRIBUTING.md require regression evidence and visible original failures. Boundary Discipline and ADR0028/0029/0030 keep field acceptance in Runtime, diagnostics observational, and external failure identity intact. Known-field construction matches the public interfaces without changing exports or dependencies.

Fault reporting correction: The failure branch no longer reads caller fields. Public regressions demonstrate that invalid attributes preserve the accepted name and original Fault; invalid names retain their first value; and a first name or attributes read failure reaches the Reporter alongside the original Fault. Missing name context is explicitly described without retrying the getter.

Judgment / ponytail: No actionable Fowler smell, correctness, safety, load, speed or testing finding. Local captures introduce no persistent state or abstraction. Ordinary validation order, disabled-event optional-error behavior, frozen attributes, raw error identity and asynchronous Sink context remain intact.

Connected code checked: Host construction, Installation/Activation scopes and lifecycle events, PluginDiagnostics.emit/reportFault, Fault Reporter isolation, error deduplication, DiagnosticEventInput and normalization, and Kernel/Session/History/Renderer and Examples consumers. Assumed load: an isolated Host per Canvas Runtime with external callbacks.

Actual checks at this head:

- Verified exact commits, tree, complete binary patch hash, full new test file and clean working tree.
- `git diff --check`: passed.
- `bun test packages/runtime-cordis/tests packages/diagnostics/tests`: 158 passed, 0 failed, 606 assertions, including all 27 new cases.

Not checked: affected consumers, typecheck, builds, browsers, full engineering gate, remote CI, publication or remote report readback. This review does not establish delivery readiness.
