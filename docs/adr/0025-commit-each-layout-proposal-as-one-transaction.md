# Commit each Layout Proposal as one Transaction

A Provider-specific Layout Command captures the current Canvas View, computes and validates one Layout Proposal, then replaces every actually changed Node position in one synchronous Transaction if the captured revision is still current. The Command returns the resulting `CanvasCommit | null` and uses its diagnostic Command ID as Transaction metadata, so a net-changing layout naturally produces one Change Set and one History Entry without Layout-specific grouping or per-Node transactions.
