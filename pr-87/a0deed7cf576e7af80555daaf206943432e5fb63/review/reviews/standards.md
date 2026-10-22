What this change does: Interaction captures connection.materializeEdge once per Activation after existing shape and key checks. The function validated by typeof is the same function retained in the frozen effective configuration and used by Connection Gestures.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: a97f651634cf5ba21746f8d58accb859ded0dfdf
- Tree: a3a0c53514037a947aa39143348b46fe8270389c
- Binary patch SHA256: 892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1

Hard standards: No violations found in the complete three-file patch. ADR0068 keeps configuration validation and Gesture authority within Interaction. ADR0028 preserves observable Fault reporting without replacing callback failures. Boundary Discipline and Type System Discipline retain runtime function validation at the owning boundary. AGENTS.md and CONTRIBUTING.md regression requirements are supported by the retained real Gesture red and current public tests.

Callback capture remains local to resolveInteractionConfig, which runs for every fresh Activation. Unknown Connection fields still fail before the getter is read; invalid first values still produce INVALID_CONFIG. Original getter exceptions propagate unchanged. No public contract, callback wrapper, persistent cache, accessor restriction, cap or fallback was added.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The minimal local capture fixes the first incorrect ownership decision. Reviewed all changed tests and production code, Interaction setup/recovery, Renderer Input delivery, terminal Preview/Capture cleanup, materialization, Create Edge Command/Kernel checks, Fault reporting, and Composition/Examples callers. Assumed load: isolated per-Canvas Hosts with synchronous application materializers.

Actual checks at this head:

- Verified clean tree, commit history, exact head/tree/hash, prepared-task/inspection identity and complete.patch byte-for-byte.
- `git diff --check`: passed.
- `bun test packages/plugin-interaction/tests`: 37 passed, 0 failed, 213 assertions. The new Gesture case observes one accepted callback invocation, exact Endpoints, revision-2 Edge Commit, one Capture release, cleared Preview and no Fault. Recovery and existing failure/cleanup controls also pass.

Not checked: broader affected consumers, TypeScript checks, builds, full engineering gate, native browser input, current-head CI, publication or remote evidence readback. Public Renderer Input adapter tests do not establish real browser behavior.
