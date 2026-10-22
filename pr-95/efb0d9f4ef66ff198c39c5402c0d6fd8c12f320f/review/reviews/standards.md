What this change does: Both Renderer documentation examples now import and install the Port Plugin. This supplies the existing Port Service required by Renderer, alongside Kernel and Session.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Head: `7916c115aa57c0f9e44c138e91f162c38333a5e5`
- Tree: `d7b34834b717a5ba403b1b22913ad243c6b99490`
- Binary patch SHA256: `fc5dc07c335630cc6459583ebe85efadf53f4e9b98d268e28a1319f3e4ba463c`

Hard standards: no violations found. Read both complete examples, Issue #94 and its saved complete empty discussion, prepared plan, AGENTS, CONTRIBUTING, CONTEXT, tracker/discussion rules and applicable principle guidance. The two-file, four-line change preserves explicit Provider choice, readiness waiting and Host disposal. It matches Renderer’s actual static requirements and the service-availability/resource ownership contracts in ADR0002, ADR0004, ADR0044 and ADR0081.

Judgment checks: no concrete Fowler smell found. Applying ponytail-review, this is the smallest complete correction for one isolated Host per Canvas. No runtime behavior, public interface, dependency or test framework changes.

Independent checks at the reviewed head: saved patch equals the exact Git diff and stated hash; clean worktree; `git diff --check` passed. Audited and reran both complete example drivers. Each reached four active Installations, called the Provider once, delivered Document reset before Session, and disposed the Renderer once. Verified their executed installation bodies match the current Markdown after public compiled-entry path resolution and explicit recording-Provider/assertion instrumentation. `bun run docs:verify` passed for 25 modules. Actual command output is in `standards-command-log.txt`.

Not checked: visual rendering, browser input, full engineering gate, fresh builds, remote CI and report publication. The recording Provider proves protocol and lifecycle behavior, not visual output. This Standards review does not replace the independent Spec review.
