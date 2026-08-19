# @cflow/session-api

Renderer-independent Session value contracts for CFlow.

The package owns immutable `SelectionSnapshot`, `Viewport`, and
`SessionSnapshot` types without depending on Plugin Host or Runtime Service
lifecycle. Runtime mutation remains in `@cflow/plugin-session`.
