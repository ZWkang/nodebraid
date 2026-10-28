# Spec review — Issue #137

Verdict: passed. No missing or partial implementation, scope creep, or demonstrable logic mismatch remains against [Issue #137](https://github.com/ZWkang/nodebraid/issues/137), including [the reset contract decision](https://github.com/ZWkang/nodebraid/issues/137#issuecomment-6465202920).

Reviewed the complete feature from `fe94ea93ed6b06e65e5d29f7846e132a53f8cded` to `ea78f28d4362868174d7b2848652f26e70d7a093`. Independently recomputed tree `3ae24e9cebec83c6ec06106ce5e1f78aa6441cc5` and binary patch SHA-256 `bacd378539447c512f65ceae30d607a3ef519fc7501b61c0f31214984c96657a`; the worktree is clean. Prior complete implementation/caller findings remain applicable: the only change since the passed review is two lines in `scripts/collect-preview.ts`.

The collector now scrolls the real Place node button into view and waits for the observable waiting state after clicking, before sending native Canvas input. It retains all creation, Selection, revision, SVG content, Apply/Undo/Redo and full-file comparison assertions. No product code, protocol or accepted requirement changed; there is no retry, fallback or weakened acceptance.

The earlier Port-only reconstruction finding remains resolved against the explicit specification: all resets rebuild content, including same-revision Runtime resets after independent Port registration/disposal. The real Runtime/SVG browser case verifies reconstruction and DOM replacement, unchanged Document/Session, correct Port/Anchor geometry and hits, and content retention during ordinary position Commits. ADR and bilingual documentation match. `svg-reset-browser.log` records the complete SVG suite passing.

Current-head evidence: `preview-preflight-2/preview.json` matches the head/tree/patch above and records all six scenes passed, including Node authoring and the real Document file round trip; `preview-preflight-2.log` confirms completion. Scene-selector tests passed 8/8. Earlier Node/Placement/draft and Examples evidence still covers unchanged production code. The failed preflight remains preserved. This reviewer did not rerun builds or full checks.

Risk: **high**. Public editing/Placement/SVG ownership changes and Agent instructions, skills, scripts, dependency/build configuration and declaration artifacts impose the high path floor. Human review should cover request/failure ownership, reset semantics and evidence collection. Rollback is a feature-commit revert plus rebuilding dependents; no persisted-format migration or destructive operation is introduced, and exported data remains ordinary Document values.

Full managed verification, current-head CI, report/media publication/readback and post-merge acceptance remain pending delivery gates. Spec findings: 0.
