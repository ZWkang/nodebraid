# Current delivery and retained measurements

The current full engineering check and independent reviews are bound to local merge a13082d93b93d731b08f1f316aaa562df64aa3ee. The published merge has the same whole tree and ordered parents, recorded in publication-source.json.

The performance measurements were actually executed on local ece568a07a2f56ae25d6daa63d9f16d88108a5af, whose equivalent published source is f19f15f31d525063946317a373ee1c43c45b79d6. Integrating main adds the independently delivered Examples refactor. It changes the whole repository tree, but no Kernel or Diagnostics source.

After rebuilding the current checkout, all 102 listed Kernel/Diagnostics source, manifest and built artifacts match the preserved measured bytes. See [artifact equivalence](performance/current-delivery-equivalence.json). This supports retaining the pure-Kernel measurements, not claiming fresh execution at the merge head or measuring browser performance.

[Complete measurements and raw evidence](performance/README.md) retain the original source identities, all adverse net-zero observations and their six additional paired checks.

Only personal absolute path prefixes in generated engineering logs are replaced with logical markers. Original logs and receipts are retained. No numeric observation, failure, timestamp or assertion is removed. publication-redactions.json maps original/published SHA-256. The independent review texts are unchanged. Performance files retain their original publication bytes and scoped path markers.
