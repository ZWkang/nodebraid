What this change does: Kernel Node Writers retain the first Position, Size and parent value supplied by a caller. They copy owned geometry once, so later getters cannot replace the values that final graph validation sees.

Source identity:
- Base: e21c917b170b37ff60418d76a0bbcc65b8799d17
- Head: 723b81124050862940abcb8feb729e0c8baa7737
- Tree: 67f3b505dae06ba0effc38ba653ea8c757d6f2a0
- Binary patch SHA256: 7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2

Scope: the complete base...head diff, both files and all 230 new test lines. Commits 6f7b824 and 723b811 were inspected. The saved canonical patch matches Git byte for byte. Merge parents, independent base, expected append parent and prepared/inspection digest agree. I read the saved Issue #102 request and its complete empty discussion.

Hard standards: No violations found. ADR0012's owned-shell copying and opaque-data reference contract are preserved. Closed/duplicate/missing/mismatched-ID guards still precede copying. Type, Position/scalars, Size/scalars, parent and data retain their read order and original thrown values under ADR0029. Copying finishes before Draft Maps, indexes or touched IDs change. Invalid geometry remains provisional until final validation, preserving explicit in-Transaction repair.

Judgment-only smells: No concrete finding across the full Fowler baseline. The change stays in the shared copy owner. Reusing the replay parser would change validation and error timing, so a new common abstraction is not justified.

Ponytail assessment: Correct, safe and lean for one isolated Kernel per Canvas. I traced add/replace, indexes, final validation, net-zero coalescing, revision-bound Views, replay preflight/materialization and History under ADR0010/0011. Current Runtime, Layout and Preset integration was inspected. Tests cover original exceptions, caught-write atomicity, inherited getters, immutable owned shells, opaque data and deliberate later repair.

Independent command at this head:
`bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests`

Result: exit 0; 249 tests, 1276 assertions. Final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, browser interaction, full consumer suites/full engineering check, remote CI, publication or main integration.

Verdict: passed. Looks good. Ship.
