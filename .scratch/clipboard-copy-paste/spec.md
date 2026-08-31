# Clipboard Copy/Paste

Clipboard is a public, independently installable NodeBraid behavior built on the completed Duplicate Selection selected-node induced-subgraph semantics.

## Public seams

- `@nodebraid/canvas-fragment` is a pure, backend-neutral in-memory value package. A Fragment contains canonically ordered Nodes, their complete internal Edge closure, and the original Selection membership. It preserves opaque `data` references and is not a Serialized Document.
- `@nodebraid/plugin-clipboard` publishes input-free Copy/Paste Commands, a behavior Plugin, a sibling Shortcut Plugin, injected abort-aware text transport, an application-owned Fragment text codec, an application-owned fresh-ID materializer, stable errors, and lifecycle ownership.
- `interactionPlugin` remains the sole Renderer Input authority. The default shortcuts are exact Control-only or Meta-only physical `KeyC` and `KeyV` keydown bindings; Shift, Alt, repeat, and Active Gesture do not execute.

## Copy

- Empty and edge-only Selection are no-ops and do not touch the Clipboard.
- Capture one immutable committed Canvas View and Selection at command start. Include exactly selected Nodes and every Edge whose endpoints are both selected; explicit Edge selection does not expand the Node set.
- Preserve nested parent references, ports, self-loops, parallel Edges, canonical order, and opaque `data` references.
- Encode through the application codec and write only through the injected transport. No browser access or in-memory fallback exists in generic packages.
- Later Document and Selection changes do not rewrite the captured payload.

## Paste

- Read text asynchronously, decode through the application codec, and validate the resulting Fragment before materialization.
- Materialize every Fragment Node and Edge to one fresh same-namespace ID. Apply one finite world-space offset, default `{ x: 24, y: 24 }`; repeated Paste uses the same offset while the application supplies a fresh ID sequence.
- Immediately before commit, revalidate mapping availability, external parent availability, Fragment structure, and captured current Selection. Create all entities in one synchronous Kernel Transaction, then map the Fragment Selection to the pasted entities.
- A newer Selection after commit wins. Preserve the Canvas Commit and reject explicitly; never issue a compensating Transaction.
- Document Commit is the History unit. Undo removes pasted entities and Session reconciliation clears them. Redo restores Document only and does not reselect.

## Ownership and failures

- The application codec owns the Clipboard text envelope, discriminator/version, opaque data rules, external references, missing/extra fields, cycles, getters, symbols, non-finite values, and prototype-pollution defenses. Generic NodeBraid code never claims arbitrary `unknown` is JSON-safe.
- The Examples Application supplies a NodeBraid-specific JSON envelope that accepts only its known `null` data and a real `navigator.clipboard` adapter on localhost.
- Transport read/write, codec encode/decode, Fragment schema, ID mapping, target conflict, commit, cancellation, lifecycle disposal, and post-commit Selection failures remain explicit with stable identities and original causes.
- Concurrent Copy/Paste Commands are independent and are not silently queued. Disposal aborts active external operations and waits for their settlement through Command Registration lifecycle.

## Verification

- Bun public-seam tests use the real Plugin Host + Kernel + Command + Session + History + Duplicate/Clipboard behavior; test-only in-memory Clipboard transport is explicit at the true external seam.
- Cover nested parents, boundary Edges, edge-only/empty Selection, self-loop, parallel Edges, ports, repeated Paste, changed parent availability, conflicts, transport/codec/schema/mapping failures, cancellation, disposal/reactivation, concurrent Commands, Selection races, Undo, and Redo.
- Real Chromium Examples acceptance uses trusted CDP Mod+C / Mod+V and actual `navigator.clipboard` on localhost, asserting `isTrusted`, exact `defaultPrevented`, copied/pasted entities, Selection, revision, History, error behavior, and cleanup.
- Run declaration isolation, package-name imports, dependency builds, dry-run packs, Renderer browser tests, Example check, bilingual docs, root `bun run check`, and Standards/Spec review.

## Non-goals

Full Document Serialization, Persistence, migrations, collaboration wire formats, cross-version promises, HTML/image Clipboard formats, rich text, system-wide fallback storage, async Kernel Transactions, or a generic JSON codec for arbitrary opaque data.
