# @cflow/runtime-cordis

Cordis-backed Plugin Host for CFlow Canvas Runtime instances.

The package exposes CFlow-owned Plugin lifecycle interfaces and keeps Cordis
Context, Fiber, Service, and effect types inside the implementation.

Most consumers should import these interfaces from the `@cflow/core` public
facade. This package remains available as the narrow implementation entry for
advanced consumers and does not depend on `@cflow/core`.
