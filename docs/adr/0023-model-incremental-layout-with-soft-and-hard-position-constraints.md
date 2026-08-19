# Model Incremental Layout with soft and hard position constraints

Incremental Layout still recomputes the whole layout graph and treats each non-fixed Node's current position as a soft stability constraint rather than trying to infer which Nodes are new. A Fixed Node remains at its absolute world position as a hard constraint, still participates in the computation, and must appear unchanged in the resulting Layout Proposal; callers can therefore express “move only new Nodes” by fixing the existing Nodes without introducing subset-layout semantics.
