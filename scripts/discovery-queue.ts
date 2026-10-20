export interface DiscoveryState {
  head: string;
  seams: { name: string; pending: boolean; checkedHead: string | null; evidence: string | null }[];
}

export function discoveryFrontier(state: DiscoveryState): string[] {
  return state.seams.filter((seam) => seam.pending).map((seam) => seam.name);
}

export function syncDiscovery(
  previous: DiscoveryState | undefined,
  head: string,
  names: string[],
  changed: string[],
): DiscoveryState {
  if (!/^[a-f0-9]{40}$/.test(head) || new Set(names).size !== names.length || names.some((name) => !name.trim())) {
    throw new Error('Discovery requires a fixed head and unique named public seams.');
  }
  if (
    previous &&
    (!/^[a-f0-9]{40}$/.test(previous.head) ||
      !Array.isArray(previous.seams) ||
      new Set(previous.seams.map((seam) => seam.name)).size !== previous.seams.length ||
      previous.seams.some(
        (seam) =>
          typeof seam.pending !== 'boolean' ||
          typeof seam.name !== 'string' ||
          !seam.name.trim() ||
          (seam.checkedHead === null
            ? seam.evidence !== null || !seam.pending
            : !/^[a-f0-9]{40}$/.test(seam.checkedHead) || typeof seam.evidence !== 'string' || !seam.evidence.trim()),
      ))
  )
    throw new Error('Malformed discovery state.');
  const allNames = [...new Set([...names, ...(previous?.seams.map((seam) => seam.name) ?? []), ...changed])];
  return {
    head,
    seams: allNames.map((name) => {
      const prior = previous?.seams.find((seam) => seam.name === name);
      return prior
        ? { ...prior, pending: prior.pending || changed.includes(name) }
        : { name, pending: true, checkedHead: null, evidence: null };
    }),
  };
}

export function completeDiscovery(
  state: DiscoveryState,
  result: { seam: string; head: string; evidence: string; remaining?: string[] },
): DiscoveryState {
  if (result.head !== state.head) throw new Error('Investigation head changed; retain the pending seam.');
  const remaining = result.remaining ?? [];
  if (remaining.some((name) => !name.trim() || name === result.seam) || new Set(remaining).size !== remaining.length)
    throw new Error('Remaining interfaces must be distinct named seams.');
  if (
    state.seams.some(
      (seam) =>
        seam.name === result.seam &&
        !seam.pending &&
        seam.checkedHead === result.head &&
        seam.evidence === result.evidence,
    )
  )
    return structuredClone(state);
  if (!result.evidence.trim() || !state.seams.some((seam) => seam.name === result.seam && seam.pending)) {
    throw new Error('Completion requires a pending seam and execution evidence.');
  }
  const completed = {
    ...state,
    seams: state.seams.map((seam) =>
      seam.name === result.seam
        ? { ...seam, pending: false, checkedHead: result.head, evidence: result.evidence }
        : { ...seam },
    ),
  };
  for (const name of remaining) {
    const existing = completed.seams.find((seam) => seam.name === name);
    if (existing) existing.pending = true;
    else completed.seams.push({ name, pending: true, checkedHead: null, evidence: null });
  }
  return completed;
}

export interface PlanStep {
  id: string;
  blockedBy: string[];
  acceptance: string;
}

export function planFrontier(plan: PlanStep[], completed: string[]): string[] {
  const ids = new Set(plan.map((step) => step.id));
  if (
    !plan.length ||
    ids.size !== plan.length ||
    plan.some((step) => !step.id.trim() || !step.acceptance.trim() || step.blockedBy.some((id) => !ids.has(id))) ||
    completed.some((id) => !ids.has(id))
  )
    throw new Error('Plan requires unique steps, known blockers and acceptance criteria.');
  const visited = new Set<string>();
  const active = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) throw new Error('Plan dependency cycle.');
    if (visited.has(id)) return;
    active.add(id);
    for (const blocker of plan.find((step) => step.id === id)!.blockedBy) visit(blocker);
    active.delete(id);
    visited.add(id);
  };
  for (const step of plan) visit(step.id);
  const done = new Set(completed);
  if (plan.some((step) => done.has(step.id) && step.blockedBy.some((id) => !done.has(id))))
    throw new Error('Completed task has an unfinished blocker.');
  return plan.filter((step) => !done.has(step.id) && step.blockedBy.every((id) => done.has(id))).map((step) => step.id);
}
