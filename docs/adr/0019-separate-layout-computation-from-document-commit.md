# Separate layout computation from Document commit

Layout Engines compute a whole-canvas Layout Proposal asynchronously and never write the Kernel directly. The Proposal contains only its source revision and candidate Node positions, without copied Provider identity, mode, configuration, Edge Routing, or arbitrary entity patches; a Runtime Command may commit it later through one synchronous Transaction, preserving a visible boundary for cancellation, stale-result checks, and History.
