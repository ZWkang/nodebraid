---
name: verify-nodebraid
description: Verify NodeBraid Examples Application behavior with the pinned agent-browser CLI, capture PR evidence, or maintain this project's browser feature map. Use for visible Canvas changes and verification-skill upkeep.
---

# Verify NodeBraid

The runnable surface is the production Examples Application at `/basic-svg?lang=en`.
Use the [feature map](features/README.md) and existing public SVG DOM/metrics.
Browser evidence complements `bun run check` and independent Standards/Spec review;
it does not replace them or prove every public API.

## Launch

From the repository root, after dependencies, Chromium and ffmpeg are installed, run:

```sh
bun scripts/collect-preview.ts --base <approved-base-sha> --out .tmp/preview-<run-id>
```

The collector requires a clean committed HEAD, builds the real Examples Application,
serves its `dist` on an owned random loopback port, and runs selected scenes serially.
Each scene gets its own `agent-browser` session and browser. Use a new
output directory for each attempt. The command preserves failed attempts too.
Every browser command explicitly uses that scene's empty `browser-config.json`
and a child environment without inherited `AGENT_BROWSER_*` values. User/project
browser defaults, persistent profiles and auto-connect settings are not loaded;
the collector does not modify the user's environment or configuration.

The installed `agent-browser` version is pinned in `package.json`. If setup is
missing, use the repository's documented `bun install` and
`bunx agent-browser install` (`--with-deps` on Linux CI); surface setup failure.

## Doctor

The collector saves `ffmpeg -version` in `ffmpeg.log` and requires success before
starting a browser. Each fresh session opens the Example, sets an even 1280×720
viewport, then uses `record restart recording.mp4` to begin on that configured
page. Agent-browser 0.20's `record start` creates another page with an odd default
height, and its H.264 encoder requires even dimensions; `restart` preserves the
configured page even when no recording exists yet. Doctor runs after recording
begins and verifies `[data-example-status="ready"]`, exactly one
`[data-nodebraid-renderer-svg-root]`, and the initial metrics: revision 1,
three Nodes, one Edge, no Selection, and zoom 1.00×. A listening port alone is not
readiness. After a failed drive, inspect failure evidence and use a fresh run;
do not continue driving an unknown state.

## Drive

Use the four mapped scenes. Agent-browser owns the browser and performs native
clicks; keyboard shortcuts and dragging use the existing CDP native-input seam
with explicit key codes, modifiers, coordinates and held buttons. Version 0.20's
`press` does not parse modifier combinations and `mouse down/up` uses (0, 0).
`eval` only reads DOM, geometry and clipboard state, with the existing five-second
failure deadline for page metrics. Clipboard permissions use the owned context;
keep that CDP connection open through the scene because disconnect resets them.
Never substitute internal Runtime setters, injected Events or a mock Canvas.

Changed runtime/Examples source selects relevant scenes deterministically in
[`preview-scenarios.ts`](../../../scripts/preview-scenarios.ts). Shared code and
collector/skill changes run all four. Docs/tests-only changes are explicitly
`not-applicable`. Layout changes run Canvas regression scenes with a limitation:
the Example has no Layout control, so Layout execution remains unverified.

## Evidence

`preview.json` binds the approved base, recorded HEAD, tree and binary diff digest
to each scene's result, action steps, relative artifact paths and SHA-256 hashes.
Every scene retains before/after PNGs, accessibility snapshots, the original
`recording.mp4`, and `actions.log`; intermediate states make zoom, duplication and connection
visible. **Before/after means before/after the interaction at the same HEAD**, not
a visual comparison with the base commit. The collector checks real page metrics
and resulting SVG entities, not just screenshots.

Agent-browser 0.20 encodes changed frames into very short videos. After successful
recording, the collector uses ffmpeg to make `review.mp4`, a clearly labeled 15×
slow playback of those captured frames. Both videos retain their own hashes;
the original is not overwritten. `review-encoding.log` keeps the actual command
and encoder output. Slow playback is for inspection and cannot measure performance
or real elapsed time. Encoding failure fails the scene while retaining its evidence.

A failing scene attempts a failure screenshot/snapshot, stops its recording and
returns a nonzero overall exit status. Build failure keeps `build.log`. Inspect
the recorded failure rather than replacing it with an unrelated page. A missing
artifact is not evidence. Confirm `preview.json` and its files remain readable
after cleanup. PR publication belongs to the repository's trusted publication
flow, not this skill.

## Cleanup

The collector closes only its named browser sessions and owned server in cleanup;
it never deletes evidence or closes user tabs. Recording-stop and cleanup errors
remain failures. Do not kill browser processes by generic name. For an interrupted
run, use the exact owned session identifier from that run's commands to close it,
then check the retained output directory before retrying.

## Maintenance

First reconcile the feature index with its files, then inspect changes since the
chosen base for new routes, controls or public entry points missing from the map.
Name the actual source path for each coverage gap; a clean pass of the old map
does not verify a newly added feature.

Read source for the four feature files in parallel when helpful; one coordinator
owns live driving. Run the full map serially:

```sh
bun scripts/collect-preview.ts --base <approved-base-sha> --out .tmp/preview-maintenance-<run-id> --all
```

Compare each feature's entry points, selectors and observable outcomes with source
and this live result. Distinguish documentation drift, a harness gap and a product
defect. Correct the map/harness within the maintenance request, and re-drive any
changed recipe. Report product defects through the Issue workflow without
weakening assertions or rewriting the map to describe a regression as expected.
Keep live driving serial; cleanup preserves all attempts. Report covered and
uncovered features and whether maintenance completed, changed files, or was blocked.

Adapted to this repository from pstack's
[create verification skill](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/create-verification-skill/SKILL.md)
and [maintain verification skill](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/maintain-verification-skill/SKILL.md).
