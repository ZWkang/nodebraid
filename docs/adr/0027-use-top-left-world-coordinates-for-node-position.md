# Use top-left world coordinates for Node position

`Node.position` and every Layout Proposal position identify the top-left corner of the Node bounds in absolute world coordinates. Provider Adapters normalize their native results to that anchor before crossing the Layout Engine seam: Dagre center coordinates subtract half the Node Size, while ELK shape coordinates map directly; Renderer, Fixed Node, and Transaction semantics therefore do not vary by Provider.
