What this change does: Adds headless Node creation and source-guarded data editing, one-shot placement, synchronous custom SVG content, and application-owned drafts. Every Renderer reset rebuilds content, including same-revision Port Contribution resets.

Review identity: base `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`; head `ea78f28d4362868174d7b2848652f26e70d7a093`; tree `3ae24e9cebec83c6ec06106ce5e1f78aa6441cc5`; binary patch SHA256 `bacd378539447c512f65ceae30d607a3ef519fc7501b61c0f31214984c96657a`.

Looks good. Ship. No remaining documented-standard breaches or concrete smell findings.

The previous P3 capability-map finding is fixed: the drag recipe reads the custom Node outer group's actual translate matrix. The reset contract agrees with [Issue #137 comment 6465202920](https://github.com/ZWkang/nodebraid/issues/137#issuecomment-6465202920) and ADR-0086.

Reviewed the complete feature against AGENTS/CONTRIBUTING, domain/ADR contracts and applicable principles, including connected Command, Kernel, Session, Interaction, Port and Renderer callers. Assumed load is interactive editing within one Canvas Runtime. Public boundary checks, failure identity, request replacement/cleanup, SVG preflight/deep rollback, draft conflicts and file round trips retain their documented owners.

The final two-line collector change scrolls the Place node control into view, then waits for the observable placement state before clicking Canvas. It preserves native input and all graph, Selection, revision, SVG and file assertions. It adds no retry, fallback or weaker success condition. Production code is unchanged from the preceding review.

Observed evidence: the current-head six-scene preview passed; its manifest source matches the head/tree/patch above. The formerly failing second placement now creates the Note and completes the real file round trip. Original failure evidence remains preserved. Scene-selector tests passed (8 tests, 30 assertions), and agents:typecheck completed. The preceding SVG suite exited 0 with real Runtime Port registration/disposal reset coverage plus 214 geometry, 72 native policy, 72 constructor-failure and 48 tolerance cases; those browser sources are unchanged by the collector fix. Earlier 36-test independent and 329-test Interaction checks were not represented as new-head executions.

Risk: **high**. Public lifecycle and SVG ownership changes plus Agent skills, scripts, package/build configuration and declaration checks trigger the high path floor. Full human review remains required. Revert this feature commit to restore previous behavior; there is no persistent-format migration or server write, and exported files remain intact.

Not checked: formal full verify, remote CI and report publication/readback remain delivery work. Passing review does not establish ready or merge status.

Standards: 0 findings. Verdict: Ship.
