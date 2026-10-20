# Local workflow evidence and discovery reliability

Source: [Issue #10](https://github.com/ZWkang/nodebraid/issues/10). The user approved
the five workflow review findings in the current Codex chat. Base:
`2eb4bbd57260feefc7b1645133d0838ee70dc779`.

## Accepted behavior

- A versioned local command owns prepare, verification, publication and readiness.
  Prepared input is independent and immutable. Bind actual engineering check logs,
  both independent reviews and exact head/tree/raw-patch digest; verify the actual
  remote tree and expected append-only parent. New heads need fresh verification.
- Complete GitHub context preserves edited feedback, resolved-thread replies,
  pending/failed CI and human change requests. A receipt cannot certify itself or
  borrow another PR/head's dispositions. No silent API fallback or success path.
- A separate persistent public-seam queue retains unexamined work after advancing
  the main SHA and across no-change heartbeats. Failed or stale investigation does
  not remove work. Explicit initialization migrates old coarse checkpoints.
- Execution tests use isolated Git repositories and real processes for failure,
  repair, paging and restart. Dependency plans reject unknown/cyclic/skipped
  blockers. These tests do not claim a live remote AI repair happened.
- Default-branch rules require PR and current Checks, resolve conversations and
  block force/deletion. A single maintainer needs no self approval. Read back actual
  active rules before claiming activation; authentication failures stay visible.

## Public test seams

1. Task input -> checked/reviewed source -> actual publication -> current-head state.
2. GitHub REST/GraphQL pages -> complete feedback and CI snapshot.
3. Local commands at filesystem, Git and child-process boundaries, including restart.
4. Persistent discovery pending/complete transitions and dependency frontier.
5. GitHub default branch/ruleset readback (live configuration, never a local fixture).

## Slices

1. Binding: reproduce stale evidence/self-comparison and prevent them.
2. Execution (blocked by binding): versioned CLI, complete feedback and process tests.
3. Discovery: recover pending seams and validate dependency plans.
4. Delivery (blocked by execution and discovery): protocol/docs, full engineering
   checks, two review axes, verified publication/current CI and ruleset readback.

Keep local ChatGPT subscription execution, current chat scheduling, no API keys,
and final human merge. Do not change product public contracts or start a daemon.
