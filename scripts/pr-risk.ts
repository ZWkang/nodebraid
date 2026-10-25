export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  level: RiskLevel;
  rationale: string;
  evidence: string;
  rollback: string;
}

export interface RiskSummary {
  level: RiskLevel | 'unclassified';
  route: 'automatic' | 'quick-human' | 'full-human';
  reasons: string[];
}

const levels: RiskLevel[] = ['low', 'medium', 'high'];
const buildConfiguration = new Set([
  'package.json',
  'bun.lock',
  'bun.lockb',
  'bunfig.toml',
  'skills-lock.json',
  'renovate.json',
  '.npmrc',
  '.gitignore',
  '.prettierignore',
  '.editorconfig',
]);

export function validateRiskAssessment(value: unknown): asserts value is RiskAssessment {
  const risk = value as Partial<RiskAssessment> | null;
  if (
    !risk ||
    typeof risk !== 'object' ||
    !levels.includes(risk.level as RiskLevel) ||
    ![risk.rationale, risk.evidence, risk.rollback].every((field) => typeof field === 'string' && field.trim())
  )
    throw new Error('Risk assessment requires a low/medium/high level, rationale, evidence and rollback.');
}

function minimumRisk(path: string): RiskLevel {
  const name = path.split('/').at(-1)!;
  if (
    /^(?:AGENTS|CLAUDE)\.md$/i.test(name) ||
    /(?:^|\/)(?:\.agents|\.claude|\.codebuddy|\.github|scripts)(?:\/|$)/.test(path) ||
    /(?:^|\/)docs\/agents(?:\/|$)/.test(path) ||
    /^packages\/[^/]+\/artifacts(?:\/|$)/.test(path) ||
    /(?:^|\/)\.vitepress\/config\./.test(path) ||
    buildConfiguration.has(name) ||
    name.startsWith('tsconfig') ||
    name.startsWith('.prettierrc') ||
    name.includes('.config.')
  )
    return 'high';
  if (/^(?:src|packages\/[^/]+\/src)(?:\/|$)/.test(path)) return 'medium';
  return 'low';
}

export function summarizeRisk(
  reviews: { standards: { risk?: RiskAssessment }; spec: { risk?: RiskAssessment } },
  changedFiles?: string[],
): RiskSummary {
  if (
    changedFiles !== undefined &&
    (!Array.isArray(changedFiles) ||
      changedFiles.some(
        (path) =>
          typeof path !== 'string' ||
          path.includes('\0') ||
          path.split('/').some((part) => !part || part === '.' || part === '..'),
      ) ||
      new Set(changedFiles).size !== changedFiles.length)
  )
    throw new Error('Changed files must be distinct repository-relative Git paths.');

  let level: RiskLevel = 'low';
  let complete = true;
  const reasons: string[] = [];
  for (const axis of ['standards', 'spec'] as const) {
    const assessment = reviews[axis].risk;
    if (assessment === undefined) {
      complete = false;
      reasons.push(`${axis}: risk assessment is missing.`);
    } else {
      validateRiskAssessment(assessment);
      if (levels.indexOf(assessment.level) > levels.indexOf(level)) level = assessment.level;
      reasons.push(`${axis}: ${assessment.level} — ${assessment.rationale}`);
    }
  }
  if (!changedFiles?.length) {
    complete = false;
    reasons.push('Changed-file evidence is missing or empty.');
  } else {
    for (const path of changedFiles) {
      const minimum = minimumRisk(path);
      if (minimum === 'low') continue;
      if (levels.indexOf(minimum) > levels.indexOf(level)) level = minimum;
      reasons.push(`${path}: minimum ${minimum} risk.`);
    }
  }
  if (!complete) return { level: 'unclassified', route: 'full-human', reasons };
  return {
    level,
    route: level === 'low' ? 'automatic' : level === 'medium' ? 'quick-human' : 'full-human',
    reasons,
  };
}
