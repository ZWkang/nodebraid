What this change does: captures Interaction geometry and associates Node Drag values by semantic NodeId. The previous index-swap defect is fixed, but unrelated metadata is copied from a different source.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `cf231f772e0f5431281fec172b8c2419e1cce370`
- Tree: `09ba31e70045c804451744ef56db09ae912a55f3`
- Binary patch SHA256: `07d932f48e6b5f0d3c08f2cd4cb1aff2ee93f3bded85a99ab3de32aff1acecb8`
- Task digest: `931f3d5bf15180095ee77655c8da3308ac84817af0cf9e85a5726b0e509a25d3`

Re-read the complete four-file/two-commit patch, full Issue132/empty discussion, plan, all browser definitions and connected acceptance, DOM journal, effective-state, Hit Test and input code. Canonical bytes, clean checkout and identities passed fresh checks.

**Must fix**

1. **P2: preserve the copy-phase Point metadata source** (`packages/renderer-svg/src/interaction-projection.ts:128–129`).
   A caller iterator can yield matching NodeIds/coordinates in distinct Point objects while map still receives the original candidates. Using cached `baseSource/positionSource` copies the iterator clone's metadata instead of the original map candidate's metadata. My fresh acceptor probe observed base reading the original enumerable getter once and throwing its exact Error; head skips that getter and accepts the projection. Coordinator public SVG records confirm both Point slots and the opposite throwing-source case: base 4/4 passes, head 0/4. This breaks Issue132's unchanged enumerable-copy requirement, Boundary Discipline and ADR0029 failure preservation. Keep numeric values cached by NodeId, but copy unknown metadata from the actual map candidate's geometry source, preserving original receiver/order. Add those controls without new array restrictions.

The prior P2 is closed: validated NodeId association handles supplied callback indices and equivalent clones. No other hard-standard violation or concrete judgment-only Fowler smell was found. Reflect copying otherwise retains descriptor/enumeration behavior and shallow ownership; eager Node Drag versus sequential geometry validation remains intentional.

Ponytail: the shared ownership boundary is appropriate for isolated SVG Targets; separate validated numbers from unrelated copy sources before shipping.

Independent `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-session/tests`: **295 tests, 2167 assertions**, exit 0. The separate metadata probe exited 0 with the regression observations. Browser evidence was read, not executed by this reviewer.

Risk: **medium**, under deployed public-source rules. Geometry acceptance and exception behavior change; the complete review, tests and confirmed regression require focused human review. Rollback must undo both Issue132 commits, or the complete mapped publication, restore the base and recreate Renderers. Code rollback cannot undo application Commands already executed.

Not independently run: browsers, strict TypeScript, product builds, affected/full checks or remote CI/publication.

**Verdict: changes-requested. Fix 1 first.**
