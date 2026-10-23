What this change does: Basic Canvas captures all four numeric Interaction settings when its Plugin is created. Inherited and non-enumerable values now reach the same Interaction validator as ordinary properties.

Source identity:
- Base: 227192241e003231e2b939fe7b814bdc075ba2a3
- Head: a1ff3d87e5e07f049ed30a6285124d1e415ec565
- Tree: 6efa3dfc1aaeb1905bb6fb3a81c4a47c126070c9
- Binary patch SHA256: bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f

Scope: the complete base...head diff, both files and all 159 new test lines. Commits bef165a and a1ff3d8 were inspected. The canonical saved patch matches Git byte for byte. The merge parents, independent review base, expected append parent and task/inspection digest agree. I read the complete Issue #100 request, its empty discussion and the prepared plan.

Hard standards: No violations found. ADR0066 and Boundary Discipline keep validation in Interaction; the preset only owns a snapshot. Normal property reads preserve inherited values, non-enumerable values, getter receivers and original exceptions. Rest/spread still retains unknown fields for existing validation. Default/nullish handling, Connection capture and nested copying, Renderer configuration identity and Child cleanup remain unchanged.

Judgment-only smells: No concrete finding across the full Fowler baseline. The shared factory changes one capture step, without duplicating Interaction's validation or introducing another configuration model.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced creation-time capture, fresh Host installations, Interaction normalization, wheel/pan Session updates, Command/History lifecycle and Examples. Current Runtime Binding validation and the separately installed Layout Plugin remain compatible. Public tests exercise invalid policies, observable zoom/drag behavior, mutation isolation, getter failures, Connection behavior and cleanup.

Independent command at this exact head:
`bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-history/tests`

Result: exit 0; 108 tests, 455 assertions. Final source identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, browser interaction, full engineering check, current remote CI, publication or main integration. Synthetic Renderer input is public API evidence, not browser evidence.

Verdict: passed. Looks good. Ship.
