# Verification report

Run: 6effc8e5-4000-4e99-a7db-33a105722045 · ZWkang/nodebraid · issue #100

## Reviewed and published source

- Review base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Independently prepared append parent: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Published head: `bef165a67f17d2cbc28519baa4efe6da11d6c56f`
- Reviewed local head: `65b1da44adec388fd586d9806670ce3895972752`
- Tree: `a4c45edaf0ef9ec63f3e0bdeb3ee6e9983adde93`
- Complete binary patch SHA-256: `bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `dcf13482b68bc2422fc4d714df1226ab0ef259aa`, Basic Canvas silently discards inherited or non-enumerable numeric Interaction policy fields. A legal class with `minZoom = 2` and `maxZoom = 1` exposed through prototype getters is rejected by direct Interaction installation, but becomes active through `createBasicCanvasPlugin()`.

A fresh compiled public-package probe creates real Plugin Hosts, Kernel, Port, Command, Session, Renderer Plugin and Interaction. A public-interface recording Renderer supplies the external backend seam; no Runtime collaborator or configuration validator is mocked. Six comparisons complete with Host cleanup:

| Policy fields | Direct Interaction | Basic preset |
| --- | --- | --- |
| own enumerable minZoom 2 / maxZoom 1 | INVALID_CONFIG | INVALID_CONFIG |
| inherited class getters, same values | INVALID_CONFIG | **active** |
| own non-enumerable fields, same values | INVALID_CONFIG | **active** |

The invariant that the preset preserves the supplied invalid policy fails with exit 1. The exact reproduction also typechecks against current compiled public declarations. Existing preset tests still pass: **20 tests / 57 assertions**. Fresh preset build and declaration/artifact checks pass.

Original executable source and outputs: local run `20261023T072954-discovery-preset-basic`, `preset-policy-repro.ts`, `preset-policy-red.log`, `preset-policy-types.log`, `preset-build.log`, and `preset-tests.log`.

## Contract and cause

[ADR0066](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0066-publish-a-backend-neutral-basic-canvas-composition.md) keeps the preset an ordinary Composition with Interaction owning policy validation. The existing public [readiness tests](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/preset-basic/tests/readiness.test.ts) require creation-time Interaction snapshots, original Interaction failures, and supported inherited/non-enumerable Connection fields. [InteractionConfig](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/plugin-interaction/src/contracts.ts) is a readonly structural interface. Direct [Interaction normalization](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/plugin-interaction/src/interaction-config.ts) reads its known numeric properties normally.

The preset's `snapshotInteractionConfig()` explicitly captures Connection, but obtains `dragThreshold`, `wheelZoomSensitivity`, `minZoom` and `maxZoom` only from object rest/spread. Rest/spread excludes inherited and non-enumerable properties. Interaction therefore validates defaults instead of the supplied policy. The defect belongs to the preset's ownership transfer, not Interaction validation.

## Acceptance

- Capture all four existing numeric Interaction policy properties through their normal public property reads at Composition creation, once each, and retain those values in the owned snapshot across caller mutation and fresh Host installations.
- Inherited, non-enumerable and ordinary enumerable policies must retain the same supported values. Invalid supplied policies must still fail through Interaction's existing INVALID_CONFIG validation instead of becoming defaults.
- Preserve the original first-read getter exception identity; valid/default/undefined behavior; existing Connection single capture and nested snapshot; unknown/malformed field handling; Renderer config identity and ordinary readiness, rollback and cleanup.
- Repair the shared preset factory with the smallest sufficient change. Do not change public interfaces, validation ownership, optional Plugin installation, algorithm policies, security rules or Runtime behavior. No accessor ban, retry, cap, fallback or dependency.
- Use the existing public Host/Composition/Renderer seam for red/green and relevant valid/invalid/getter/fresh-Host controls, then connected consumers and affected checks, independent Standards with ponytail-review and Spec, the versioned formal full check, exact source/tree/first-parent publication, current-head CI and complete immutable report/media readback.
- Keep this Issue open until human merge, actual main integration and whole-Issue acceptance. Public API policy regressions and ordinary browser Canvas scenes establish different coverage.

## Deduplication

Complete all-state collections contain **99 Issue/PR records and 51 PRs**, both through final short pages. Full #84 and #86 bodies and all discussion were read: #84 / PR #85 retain the Connection object across changing getters; #86 / PR #87 retain its validated materializer in direct Interaction. Neither preserves these four numeric policy properties through the preset. Current #96 / PR #97 and #98 / PR #99 repair Runtime Binding descriptors and Layout Engine identity, respectively; they do not touch this factory.


### public-policy-regression-and-fix

Public Host/Composition red-green retains four numeric policies for inherited/non-enumerable fields; original getter failures and one capture per property remain observable.

Dependencies: none

### affected-consumers

Current affected consumers/types and compiled original reproduction pass; valid policies, fresh Hosts, defaults and prior Connection/lifecycle behavior preserved.

Dependencies: public-policy-regression-and-fix

### independent-review

Independent Standards with ponytail-review and Spec inspect exact committed head/tree/full binary patch against original Issue100 and applicable ADRs.

Dependencies: affected-consumers

### formal-engineering-check

Pinned deployed main agents:run verify executes the actual full check after both reviews pass and retains original logs.

Dependencies: independent-review

### source-publication

Actual remote tree equals verified tree and first parent matches independently saved append parent.

Dependencies: formal-engineering-check

### current-head-ci-and-reports

Current published-head CI, complete paginated feedback, full report and applicable preview artifacts pass immutable byte/hash readback.

Dependencies: source-publication

### human-merge

Human review and normal protected merge to main.

Dependencies: current-head-ci-and-reports

### main-integration-acceptance

Fetched actual main includes delivery merge and passes fresh whole-Issue public acceptance before closure.

Dependencies: human-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

/Users/zhou/.codex/local-workflows/nodebraid/runs/6effc8e5-4000-4e99-a7db-33a105722045/reviews/65b1da44adec388fd586d9806670ce3895972752/standards.md

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

/Users/zhou/.codex/local-workflows/nodebraid/runs/6effc8e5-4000-4e99-a7db-33a105722045/reviews/65b1da44adec388fd586d9806670ce3895972752/spec.md

## Behavior evidence

### conformant-public-policy-red

red — passed; exit 1; expected exit 1.

Type-valid public regressions against original main factory reject bad policy but fail because inherited/non-enumerable fields are dropped. Source was restored in finally; unchanged final fixtures then pass the fixed factory. Retained original failing execution.

Command: `bun test packages/preset-basic/tests/numeric-policy.test.ts`

[Original command output](logs/behavior-1.log)

### current-public-composition

green — passed; exit 0; expected exit 0.

Current 65b1 source passes47 Composition public tests/147 assertions. Real public Renderer Input verifies sensitivity/clamps/drag threshold for enumerable/inherited/non-enumerable fields, caller mutation, two fresh Hosts, exact original getter errors and actual cleanup. This is public API input, not native browser input.

Command: `bun test packages/preset-basic/tests`

[Original command output](logs/behavior-2.log)

### current-connected-public-seams

green — passed; exit 0; expected exit 0.

Current exact committed source passes connected preset, direct Interaction and Renderer public seam suites, preserving configuration ownership, original domain errors, lifecycle and actual backend seam behavior.

Command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-renderer/tests`

[Original command output](logs/behavior-3.log)

### current-original-compiled-repro

green — passed; exit 0; expected exit 0.

Original six real public-package comparisons repeated with only nine compiled package paths adapted to the task checkout. Both direct Interaction and preset now reject all three invalid-policy property forms with INVALID_CONFIG; every actual Host is disposed.

Command: `bun compiled-policy-repro.ts`

[Original command output](logs/behavior-4.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Actual affected checks include core facade/preset/root Layout composition, Example browser suites and documentation. Passed before commit at byte-identical source; committed identity recorded independently in inspection.json.

Command: `bun run check:affected --base origin/main`

[Original command output](logs/behavior-5.log)

### historical-test-literal-failure

check — failed; exit 1; expected exit 0.

Initial supplemental test used a transposed literal for exp(0.1). Original failure retained; corrected expected literal to1.1051709180756477 without changing tolerance/production, then real conformant red/green rerun. Not a current-source delivery failure.

Command: `bun test packages/preset-basic/tests`

[Original command output](logs/behavior-6.log)

### historical-bun-each-types

check — failed; exit 1; expected exit 0.

Initial readonly literal tuple was passed directly to Bun test.each, whose declarations require a mutable array. Original type error retained; use a mutable copy without changing inputs. Corrected fixtures typecheck even with original production before definitive red replay.

Command: `bunx tsgo --noEmit -p packages/preset-basic/tsconfig.json`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
