What this change does: Keeps Shortcut execution completion reliable when native Command-error inspection throws. One stable command Fault retains the original rejection and actual inspection failure; completion runs in finally.

- Base: `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`
- Head: `618cb61d25990415e4ab27f0132f2247dc7b8972`
- Tree: `bf0a2377f8e5cd5596b692e98d936d9ae4905a39`
- Binary patch SHA256: `c2fc1bdcb28af89dc09cd4c44b4137503e5e02f3b36d589762e64db655caf476`
- Changed files: `packages/plugin-interaction/src/shortcut-runtime.ts`; `packages/plugin-interaction/tests/lifecycle.test.ts`.

**Hard standards:** No documented violation found. ADR0074's wait/reservation/release contract and ADR0028/0029's Fault and original-failure contracts remain intact. The narrow classification catch preserves two exact failure references without flattening. The outer finally releases only the completed execution; concurrent executions remain tracked. Genuine capability-unavailable and expected disposal-abort branches retain their existing behavior.

I traced Command execution, Interaction wiring, scoped Runtime diagnostics, Basic Composition and Duplicate/Clipboard registrations. Public tests cover prototype/code inspection, seven actual thrown values, Sink enabled/disabled, disposal before/after rejection, cached disposal and replacement Binding isolation. The fixture implements the public Renderer seam; it is not native keyboard evidence.

**Judgment:** No concrete Fowler smell needs a change. Classification and completion belong at this existing Shortcut owner; another abstraction would add no needed responsibility. Assumed load: isolated per-Canvas Hosts with concurrent Shortcut executions and arbitrary application Handler failures. Looks good. Ship.

**Independent checks:** `/Users/zhou/.bun/bin/bun test packages/plugin-interaction/tests packages/plugin-command/tests packages/runtime-cordis/tests packages/diagnostics/tests packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/preset-basic/tests` exited 0: **867 pass, 0 fail, 6557 assertions**, 48 files. Full raw output retained. Exact canonical patch bytes, two paths, unchanged policy, clean head/tree and current compiled repair matched before/after.

**Discussion/evidence:** Read Issue 136 and comment 6463977910. Historical root-only public-program failures remain failures; no old program or dirty-tree result is certified green at this head. Repository assertions directly check Fault name, Command ID/scope and both failure identities.

**Risk: medium.** Public implementation changes Fault propagation and execution ownership. Evidence is the complete connected-code review and fresh 867-test run. Revert the entire 618cb61 delivery to base fe94 and recreate affected Bindings/Hosts. Rollback cannot undo application Commands already executed. Focused human review/merge remains required under canonical pr-risk.

Not checked independently: build, formal full check, browsers, corrected compiled-program certification, publication or current-head CI. Worktree access stopped.

**Verdict: passed** (Standards + ponytail-review).
