# Publication notes

The source tree and first parent of the published commit were checked against the locally verified commit. Full tests and performance ran on the local commit; this report does not claim they ran remotely at a different SHA.

Only personal absolute path prefixes in generated engineering logs are replaced with logical markers. The complete original logs and receipts remain locally preserved. No result, failure, adverse measurement, timestamp or assertion is removed. The original/published SHA-256 mapping is recorded in publication-redactions.json. The two independent review texts are unchanged.

The performance attachment includes all raw measurements, profiles, source text, identity and redaction mappings. Its generated README uses the verified published source link; numeric measurements and the benchmark bytes remain unchanged.

Full performance comparison: [performance/README.md](performance/README.md). Net-zero regression observations and all six additional pairs: [diagnosis](performance/reports/netzero-diagnostic.md).

There are no visible Canvas behavior changes in this PR. Local full verification includes real browser suites; CI preview evidence is managed independently and is not used as a performance benchmark.
