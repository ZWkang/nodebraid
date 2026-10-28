# Verification report

Run: issue-137-20261028-reset-semantics · ZWkang/nodebraid · issue #137

## Reviewed and published source

- Review base: `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`
- Independently prepared append parent: `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`
- Published head: `5189878bd7b706aacc353cdef6abd3480fd30117`
- Reviewed local head: `ea78f28d4362868174d7b2848652f26e70d7a093`
- Tree: `3ae24e9cebec83c6ec06106ce5e1f78aa6441cc5`
- Complete binary patch SHA-256: `bacd378539447c512f65ceae30d607a3ef519fc7501b61c0f31214984c96657a`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: high. Route: full-human.

- standards: high — The complete feature changes public Node editing, Placement lifecycle and SVG ownership. Agent skills, scripts, package/build configuration and declaration checks trigger the high path floor and require full human review.
- spec: high — The complete feature changes public Node Editing and Placement contracts, SVG content ownership and lifecycle behavior. Agent instructions, skills, scripts, dependency/build configuration and declaration artifacts impose the high path floor. The two-line collector visibility/state-wait fix retains the accepted behavior and assertions.
- .agents/skills/control-nodebraid/references/capabilities.md: minimum high risk.
- .agents/skills/verify-nodebraid/SKILL.md: minimum high risk.
- .agents/skills/verify-nodebraid/features/README.md: minimum high risk.
- .agents/skills/verify-nodebraid/features/node-authoring.md: minimum high risk.
- AGENTS.md: minimum high risk.
- bun.lock: minimum high risk.
- docs/agents/pr-evidence.md: minimum high risk.
- examples/app/package.json: minimum high risk.
- package.json: minimum high risk.
- packages/core/artifacts/check-declarations.ts: minimum high risk.
- packages/core/package.json: minimum high risk.
- packages/core/src/index.ts: minimum medium risk.
- packages/plugin-interaction/artifacts/check-declarations.ts: minimum high risk.
- packages/plugin-interaction/package.json: minimum high risk.
- packages/plugin-interaction/src/diagnostic-events.ts: minimum medium risk.
- packages/plugin-interaction/src/index.ts: minimum medium risk.
- packages/plugin-interaction/src/interaction-error.ts: minimum medium risk.
- packages/plugin-interaction/src/interaction-plugin.ts: minimum medium risk.
- packages/plugin-interaction/src/interaction-runtime.ts: minimum medium risk.
- packages/plugin-interaction/src/node-placement.ts: minimum medium risk.
- packages/plugin-node-editing/artifacts/check-declarations.ts: minimum high risk.
- packages/plugin-node-editing/package.json: minimum high risk.
- packages/plugin-node-editing/src/contracts.ts: minimum medium risk.
- packages/plugin-node-editing/src/index.ts: minimum medium risk.
- packages/plugin-node-editing/src/node-editing-error.ts: minimum medium risk.
- packages/plugin-node-editing/src/node-editing-plugin.ts: minimum medium risk.
- packages/plugin-node-editing/tsconfig.build.json: minimum high risk.
- packages/plugin-node-editing/tsconfig.json: minimum high risk.
- packages/preset-basic/package.json: minimum high risk.
- packages/preset-basic/src/preset-basic-plugin.ts: minimum medium risk.
- packages/renderer-svg/artifacts/check-declarations.ts: minimum high risk.
- packages/renderer-svg/src/contracts.ts: minimum medium risk.
- packages/renderer-svg/src/index.ts: minimum medium risk.
- packages/renderer-svg/src/node-content.ts: minimum medium risk.
- packages/renderer-svg/src/svg-config.ts: minimum medium risk.
- packages/renderer-svg/src/svg-projection.ts: minimum medium risk.
- packages/renderer-svg/src/svg-renderer-error.ts: minimum medium risk.
- packages/renderer-svg/src/svg-renderer.ts: minimum medium risk.
- scripts/collect-preview.ts: minimum high risk.
- scripts/preview-scenarios.ts: minimum high risk.

### standards risk: high

Impact and reasoning: The complete feature changes public Node editing, Placement lifecycle and SVG ownership. Agent skills, scripts, package/build configuration and declaration checks trigger the high path floor and require full human review.

Evidence: Recomputed full review identity and reviewed the final collector-only two-line change. All six current-head preview scenes passed with exact manifest source identity; scene-selector tests passed 8 tests/30 assertions and agents:typecheck completed. Earlier real SVG/Runtime, Interaction and independent targeted checks apply to unchanged code. Formal full verify remains pending.

Rollback: Revert feature commit ea78f28d4362868174d7b2848652f26e70d7a093 to restore prior interfaces, Example and collector. No persistent-format migration or server write occurs; retain exported Document files.

### spec risk: high

Impact and reasoning: The complete feature changes public Node Editing and Placement contracts, SVG content ownership and lifecycle behavior. Agent instructions, skills, scripts, dependency/build configuration and declaration artifacts impose the high path floor. The two-line collector visibility/state-wait fix retains the accepted behavior and assertions.

Evidence: Verified current head/tree/binary patch digest and clean worktree. Prior complete implementation/caller review and reset-contract review remain applicable; only scripts/collect-preview.ts gained scrollintoview and an observable waiting-state wait. Current-head preview-preflight-2 manifest and log prove all six scenes passed; scene-selector tests passed 8/8. Runtime/SVG browser suite passes. Full delivery gates remain pending.

Rollback: Revert ea78f28d4362868174d7b2848652f26e70d7a093 as a unit and rebuild dependents. No persisted-format migration or destructive operation; exported Nodes/data remain ordinary Document values, while reverting removes authoring UI and custom SVG visuals.

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

Deliver the generic Node authoring capability in Issue #137: headless Node creation and strict source-Node data updates, synchronous custom SVG content with rectangular interaction bounds, one-shot placement, application-owned Apply/Cancel drafts, and real public/browser/file verification. Explicit reset always reconstructs custom SVG content, including same-revision Runtime Port Contribution refreshes; ordinary incremental updates retain the agreed content identity.

### node-commands

Public headless create/data-update commands preserve atomicity, exact source identity and History; meaningful package tests pass.

Dependencies: none

### svg-content

Optional synchronous SVG content preserves legacy behavior, geometric interactions, stable ownership and failure rollback; real browser contracts pass. Real Runtime Port registration/disposal confirms same-revision reset reconstruction.

Dependencies: none

### node-placement

Unified Interaction one-shot placement supports creation, cancellation, coordinates and lifecycle without double actions; public seam tests pass.

Dependencies: node-commands

### example-authoring

Real Example allows two node types, placement, Apply/Cancel, draft switch/conflict recovery, Undo/Redo and file round trip.

Dependencies: node-commands, svg-content, node-placement

### documentation-and-affected

Exports, package artifacts, ADR/domain/bilingual docs and capability/evidence maps are current; affected development checks pass.

Dependencies: example-authoring

### reviews-and-verification

Independent Standards+ponytail and Spec/risk reviews pass on current head/tree/patch; agents:run verify executes full check successfully.

Dependencies: documentation-and-affected

### publish-current-head

One PR to main has exact source publication, current-head CI and immutable full report/media readback; premerge steps complete.

Dependencies: reviews-and-verification

### main-acceptance

After merge, fetch and prove actual main integration and whole-Issue acceptance; record any remaining post-merge results.

Dependencies: publish-current-head

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Adds headless Node creation and source-guarded data editing, one-shot placement, synchronous custom SVG content, and application-owned drafts. Every Renderer reset rebuilds content, including same-revision Port Contribution resets.

Review identity: base `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`; head `ea78f28d4362868174d7b2848652f26e70d7a093`; tree `3ae24e9cebec83c6ec06106ce5e1f78aa6441cc5`; binary patch SHA256 `bacd378539447c512f65ceae30d607a3ef519fc7501b61c0f31214984c96657a`.

Looks good. Ship. No remaining documented-standard breaches or concrete smell findings.

The previous P3 capability-map finding is fixed: the drag recipe reads the custom Node outer group's actual translate matrix. The reset contract agrees with [Issue #137 comment 6465202920](https://github.com/ZWkang/nodebraid/issues/137#issuecomment-6465202920) and ADR-0086.

Reviewed the complete feature against AGENTS/CONTRIBUTING, domain/ADR contracts and applicable principles, including connected Command, Kernel, Session, Interaction, Port and Renderer callers. Assumed load is interactive editing within one Canvas Runtime. Public boundary checks, failure identity, request replacement/cleanup, SVG preflight/deep rollback, draft conflicts and file round trips retain their documented owners.

The final two-line collector change scrolls the Place node control into view, then waits for the observable placement state before clicking Canvas. It preserves native input and all graph, Selection, revision, SVG and file assertions. It adds no retry, fallback or weaker success condition. Production code is unchanged from the preceding review.

Observed evidence: the current-head six-scene preview passed; its manifest source matches the head/tree/patch above. The formerly failing second placement now creates the Note and completes the real file round trip. Original failure evidence remains preserved. Scene-selector tests passed (8 tests, 30 assertions), and agents:typecheck completed. The preceding SVG suite exited 0 with real Runtime Port registration/disposal reset coverage plus 214 geometry, 72 native policy, 72 constructor-failure and 48 tolerance cases; those browser sources are unchanged by the collector fix. Earlier 36-test independent and 329-test Interaction checks were not represented as new-head executions.

Risk: **high**. Public lifecycle and SVG ownership changes plus Agent skills, scripts, package/build configuration and declaration checks trigger the high path floor. Full human review remains required. Revert this feature commit to restore previous behavior; there is no persistent-format migration or server write, and exported files remain intact.

Not checked: formal full verify, remote CI and report publication/readback remain delivery work. Passing review does not establish ready or merge status.

Standards: 0 findings. Verdict: Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #137

Verdict: passed. No missing or partial implementation, scope creep, or demonstrable logic mismatch remains against [Issue #137](https://github.com/ZWkang/nodebraid/issues/137), including [the reset contract decision](https://github.com/ZWkang/nodebraid/issues/137#issuecomment-6465202920).

Reviewed the complete feature from `fe94ea93ed6b06e65e5d29f7846e132a53f8cded` to `ea78f28d4362868174d7b2848652f26e70d7a093`. Independently recomputed tree `3ae24e9cebec83c6ec06106ce5e1f78aa6441cc5` and binary patch SHA-256 `bacd378539447c512f65ceae30d607a3ef519fc7501b61c0f31214984c96657a`; the worktree is clean. Prior complete implementation/caller findings remain applicable: the only change since the passed review is two lines in `scripts/collect-preview.ts`.

The collector now scrolls the real Place node button into view and waits for the observable waiting state after clicking, before sending native Canvas input. It retains all creation, Selection, revision, SVG content, Apply/Undo/Redo and full-file comparison assertions. No product code, protocol or accepted requirement changed; there is no retry, fallback or weakened acceptance.

The earlier Port-only reconstruction finding remains resolved against the explicit specification: all resets rebuild content, including same-revision Runtime resets after independent Port registration/disposal. The real Runtime/SVG browser case verifies reconstruction and DOM replacement, unchanged Document/Session, correct Port/Anchor geometry and hits, and content retention during ordinary position Commits. ADR and bilingual documentation match. `svg-reset-browser.log` records the complete SVG suite passing.

Current-head evidence: `preview-preflight-2/preview.json` matches the head/tree/patch above and records all six scenes passed, including Node authoring and the real Document file round trip; `preview-preflight-2.log` confirms completion. Scene-selector tests passed 8/8. Earlier Node/Placement/draft and Examples evidence still covers unchanged production code. The failed preflight remains preserved. This reviewer did not rerun builds or full checks.

Risk: **high**. Public editing/Placement/SVG ownership changes and Agent instructions, skills, scripts, dependency/build configuration and declaration artifacts impose the high path floor. Human review should cover request/failure ownership, reset semantics and evidence collection. Rollback is a feature-commit revert plus rebuilding dependents; no persisted-format migration or destructive operation is introduced, and exported data remains ordinary Document values.

Full managed verification, current-head CI, report/media publication/readback and post-merge acceptance remain pending delivery gates. Spec findings: 0.


## Behavior evidence

### commands-and-composition

green — passed; exit 0; expected exit 0.

Real Host/Kernel/Command/History verifies Node create/data-only updates, strict stale evidence, net-zero, undo/redo and Basic integration.

Command: `bun test packages/plugin-node-editing/tests packages/preset-basic/tests packages/core/tests`

[Original command output](logs/behavior-1.log)

### placement-public-api-red

red — passed; exit 1; expected exit 1.

Before implementation the public Node Placement export is absent; this is API availability evidence, not a behavioral assertion.

Command: `bun test packages/plugin-interaction/tests/node-placement.test.ts`

[Original command output](logs/behavior-2.log)

### placement-behavior-red

red — passed; exit 1; expected exit 1.

New edge-case placement tests expose request/gesture behavior before correction; see exact assertions and cases in the retained log.

Command: `bun test packages/plugin-interaction/tests/node-placement.test.ts`

[Original command output](logs/behavior-3.log)

### placement-package

green — passed; exit 0; expected exit 0.

Public Interaction suite validates one-shot placement, cancellation, replacement, coordinates and cleanup alongside existing gestures.

Command: `bun run --filter '@nodebraid/plugin-interaction' test:self`

[Original command output](logs/behavior-4.log)

### svg-content-red

red — passed; exit 1; expected exit 1.

Real Chromium rejects createNodeContent as an unknown config before the feature is implemented.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser:self`

[Original command output](logs/behavior-5.log)

### svg-brand-red

red — passed; exit 1; expected exit 1.

Real Chromium exposes a spoofed ordinary object being accepted as SVG content before native brand checks.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser:self`

[Original command output](logs/behavior-6.log)

### svg-content-green

green — passed; exit 0; expected exit 0.

Real Chromium old+new SVG contracts verify custom content, rectangular interaction, stable identity, DOM rollback and native cross-realm ownership.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser:self`

[Original command output](logs/behavior-7.log)

### example-development-browser

green — passed; exit 0; expected exit 0.

All four real Example suites verify creation, drafts, conflicts/reload, Undo/Redo and actual files. A later CSS Port radius/equivalent subscriber-snapshot edit is covered by the final formal full check.

Command: `bun run --filter '@nodebraid/examples' test:browser:self`

[Original command output](logs/behavior-8.log)

### preview-selection

check — passed; exit 0; expected exit 0.

Preview selection includes node authoring and preserves source identity/environment checks.

Command: `bun test tests/preview-scenes.test.ts`

[Original command output](logs/behavior-9.log)

### static-development

check — passed; exit 0; expected exit 0.

Lint, formatting, bilingual module catalog and local workflow contracts pass; full check remains the canonical formal verify step.

Command: `bun run lint && bun run format:check && bun run docs:verify && bun run agents:check`

[Original command output](logs/behavior-10.log)

### runtime-port-reset

green — passed; exit 0; expected exit 0.

Real Runtime and SVG registration/disposal of Port Contributions keeps Document revision and Session while rebuilding all custom content on reset; an ordinary position commit preserves content. Full existing SVG browser suite also passes.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser:self`

[Original command output](logs/behavior-11.log)

### preview-preflight-original

check — failed; exit 1; expected exit 0.

First full preview attempt passes five existing scenes but node authoring fails because the second placement button was outside the visible viewport. The retained failed artifacts show no second creation.

Command: `bun run agents:preview --base fe94ea93ed6b06e65e5d29f7846e132a53f8cded --out /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-137-20261028-reset-semantics/preview-preflight`

[Original command output](logs/behavior-12.log)

### preview-preflight-current

check — passed; exit 0; expected exit 0.

After explicitly scrolling the placement control into view and verifying waiting state, all six real recorded scenarios pass, including two node types, Apply/Undo/Redo and actual file round trip.

Command: `bun run agents:preview --base fe94ea93ed6b06e65e5d29f7846e132a53f8cded --out /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-137-20261028-reset-semantics/preview-preflight-2`

[Original command output](logs/behavior-13.log)

### published-head-preview

check — passed; exit 0; expected exit 0.

All six recorded native UI scenarios pass on the exact published source head, including custom Nodes and complete file round trip.

Command: `bun run agents:preview --base fe94ea93ed6b06e65e5d29f7846e132a53f8cded --out /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-137-20261028-reset-semantics/published-evidence`

[Original command output](logs/behavior-14.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
