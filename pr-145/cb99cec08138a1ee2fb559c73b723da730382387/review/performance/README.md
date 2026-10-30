# Kernel transaction performance evidence

Repository: [ZWkang/nodebraid](https://github.com/ZWkang/nodebraid). This attachment reports public Kernel transaction measurements and their raw evidence.

- Base source: [`843c9484a7d32e957dceba6658b31a5662560329`](https://github.com/ZWkang/nodebraid/commit/843c9484a7d32e957dceba6658b31a5662560329).
- Local measured/reviewed source: ece568a07a2f56ae25d6daa63d9f16d88108a5af. Published source: [f19f15f31d525063946317a373ee1c43c45b79d6](https://github.com/ZWkang/nodebraid/commit/f19f15f31d525063946317a373ee1c43c45b79d6). Both have tree 2e6095cd9265a816d6e25dd8c13fe65e2d48794d and first parent 843c9484a7d32e957dceba6658b31a5662560329. Measurements ran on the local source; the published commit was independently verified to contain the same complete tree.
- Runtime: Bun 1.4.2. Harness SHA-256: `e41e3d7fc9fe2ebd88dbd333d2e07b31dc18b6ea71a3639c6f78460db5e03d81`.

The optimization reuses the transaction-maintained graph index for the committed View and reuses untouched snapshot collections. Writer capture still preserves reentrant write semantics. These measurements cover the pure public Kernel, not browser frame rate.

## Results and limits

Read the [complete comparison](reports/REPORT.md), [all nine net-zero pairs](reports/netzero-diagnostic.md), and [profile range correction](reports/profile-range-correction.md).

The 50k paired committed-change cases reduce median latency by 45.6% for one-node movement, 50.8% for moving 1% of nodes, and 33.6% for one-edge rewiring, using the median of three per-pair reductions. The full report retains every run and its variation.

Net-zero is not a demonstrated improvement. The initial three 50k pairs were all slower by 8.24–13.51%. All six focused repeat pairs are retained: 3 slower and 3 faster, median paired latency change +0.66%, range -5.95% to +27.78% (positive means slower). The cause remains unresolved; the repeat results do not erase the initial regression observations or establish no regression.

CPU percentages describe captured samples, not exact stage times. The analyzer reports actual overlap between transaction windows and the declared profile interval. Uncovered tails are unobserved, not zero cost. GC, native execution, waiting, and JIT effects are not separately resolved. Process RSS is not total allocation or a GC-time estimate.

## Evidence layout

| Directory | Included observations |
| --- | --- |
| `reports/` | Complete comparison, numeric comparison, all net-zero pairs, correction rationale |
| `matrices/base/` | Historical 20-case matrix, 3 fresh processes per case, all 60 raw results |
| `matrices/optimized/` | Optimized 20-case matrix, same unchanged executor, all 60 raw results |
| `paired/` | Contemporary 12-case comparison, 3 A/B pairs per case, all 72 raw results; 18 AB and 18 BA pairs |
| `netzero-control/` | All 12 processes from six fixed-configuration 50k net-zero pairs |
| `profiles/base/`, `profiles/optimized/` | Seven native CPU profiles per version, all accompanying numeric measurements and final overlap summaries |
| `sources/` | Byte-identical benchmark and execution/analysis source as `.txt` attachments |
| `identity/` | Source head/tree and artifact identity |

Full-matrix and paired processes use 20 warmup iterations and 30 measured transactions. Profile processes use 20 warmup and 60 measured transactions. All runs use natural GC. Preparation and assertions are outside each transaction timing window, while their allocation can still affect later GC. Historical versus optimized full-matrix differences are not treated as contemporary causal A/B comparisons.

## Reproduction and path redaction

`sources/benchmark.mjs.txt` is exactly the original benchmark bytes; rename it to `benchmark.mjs`. Restore the Python `.txt` attachments to their original `.py` names. Build the public `@nodebraid/kernel` and its diagnostics dependency at each source commit and place the harness beside the corresponding package installation. Use a fresh Bun process for each recorded command, without forced GC or concurrent benchmark/build workloads. Exact commands, arguments, schedule, and outcomes are preserved in the receipts.

Only three personal absolute path prefixes were replaced, byte-for-byte as text: `<BASELINE_RUN>`, `<RUN>`, and `<WORKSPACE>`. The private prefix values are intentionally absent. Replace these logical markers with your own local directories. Some runner defaults contain these markers; pass explicit `--base`, `--optimized`, and `--out` paths for `run-comparison.py`, and the documented explicit paths for the report/profile parsers. The unchanged full-matrix and profile executors resolve their harness and outputs relative to their own directory. The focused-control runner uses a fixed base location; map its logical marker to the local preserved base directory before reproduction. Source contents were otherwise not rewritten.

Native CPU profile JSON is attached as `*.cpuprofile.json` because the report artifact schema permits `.json`, not `.cpuprofile`. Rename it back for a profiler viewer. Its JSON layout and numeric content are unchanged; only the same permitted path prefixes inside stack URLs are replaced. Therefore its publication digest can differ from the private original digest. This extension rename itself does not transform bytes.

`redaction-manifest.json` records original/public SHA-256, byte counts, and the logical prefixes replaced for every payload file. Numeric observations, adverse results, timestamps, and error/correction explanations were not removed. Generated metadata is identified as generated. `artifacts.json` is an integration list for the enclosing review manifest; this attachment intentionally has no `report.json`.
