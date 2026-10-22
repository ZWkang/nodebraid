import { expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cli = resolve('scripts/local-agent.ts');
const preview = resolve('scripts/collect-preview.ts');
const report = resolve('scripts/verification-report.ts');
const publisher = resolve('scripts/publish-pr-evidence.ts');

test.each(['initial', 'append', 'main-sync'] as const)(
  '%s delivery keeps the review base separate from the append parent',
  (mode) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'nodebraid-run-bases-')));
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    const invoke = (file: string, ...args: string[]) =>
      spawnSync(process.execPath, [file, ...args], { cwd: root, encoding: 'utf8' });
    const json = (path: string, value: unknown) => writeFileSync(join(root, path), JSON.stringify(value));
    const read = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'));
    const commit = (message: string) => {
      git('add', '.');
      git(
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.invalid',
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '-qm',
        message,
      );
      return git('rev-parse', 'HEAD');
    };
    const value = (number: number) => {
      writeFileSync(join(root, 'value.ts'), `export const value = ${number};\n`);
      writeFileSync(
        join(root, 'value.test.ts'),
        `import { expect, test } from 'bun:test';\nimport { value } from './value';\ntest('public value', () => expect(value).toBe(${number}));\n`,
      );
    };
    try {
      git('init', '-q');
      git('switch', '-c', 'feat/issue-68');
      writeFileSync(join(root, '.gitignore'), '.tmp/\n');
      json('package.json', { scripts: { check: 'bun test value.test.ts' } });
      value(1);
      let base = commit('baseline');
      if (mode !== 'initial') {
        value(2);
        commit('existing feature');
      }
      const parent = git('rev-parse', 'HEAD');
      if (mode === 'main-sync') {
        git('switch', '-c', 'main', base);
        writeFileSync(join(root, 'main.txt'), 'new main context\n');
        base = commit('advance main');
        git('switch', 'feat/issue-68');
      }
      mkdirSync(join(root, '.tmp'));
      json('.tmp/input.json', {
        run: `fixture-${mode}`,
        repository: 'ZWkang/nodebraid',
        source: { kind: 'issue', number: 68 },
        branch: 'feat/issue-68',
        baseRefName: 'main',
        base,
        expectedParent: parent,
        request: 'Execution fixture for independent scope and parent binding; not a live review.',
        pending: [],
        plan: [{ id: 'deliver', blockedBy: [], acceptance: 'Real Git scope, real Bun check and coherent evidence' }],
      });
      expect(invoke(cli, 'prepare', '.tmp/input.json', '.tmp/run').status).toBe(0);
      expect(read('.tmp/run/prepared-task.json').expectedParent).toBe(parent);
      expect(read('.tmp/run/prepared-task.json').base).toBe(base);
      if (mode === 'main-sync') {
        git(
          '-c',
          'user.name=Test',
          '-c',
          'user.email=test@example.invalid',
          '-c',
          'core.hooksPath=/dev/null',
          'merge',
          '--no-ff',
          '-m',
          'sync main',
          base,
        );
      } else {
        value(mode === 'initial' ? 2 : 3);
        commit('current implementation');
      }
      const inspected = invoke(cli, 'inspect', '.tmp/run');
      expect(inspected.status).toBe(0);
      const { head, tree, patch } = JSON.parse(inspected.stdout);
      const fixtureReview = {
        head,
        tree,
        patch,
        verdict: 'passed',
        report: 'Execution-layer fixture metadata; not an independent reviewer result.',
      };
      json('.tmp/reviews.json', { standards: fixtureReview, spec: fixtureReview });
      json('.tmp/decisions.json', []);
      expect(invoke(cli, 'verify', '.tmp/run', '.tmp/reviews.json', '.tmp/decisions.json').status).toBe(0);
      const parents = git('show', '-s', '--format=%P', head)
        .split(' ')
        .map((sha) => ({ sha }));
      expect(parents[0]?.sha).toBe(parent);
      json('.tmp/wrong-parent.json', {
        sha: head,
        tree: { sha: tree },
        parents: [{ sha: mode === 'initial' ? '0'.repeat(40) : base }],
      });
      expect(invoke(cli, 'publication', '.tmp/run', '.tmp/wrong-parent.json').status).not.toBe(0);
      if (mode === 'main-sync') {
        const flattened = git(
          '-c',
          'user.name=Test',
          '-c',
          'user.email=test@example.invalid',
          'commit-tree',
          tree,
          '-p',
          parent,
          '-m',
          'publication dropped the main parent',
        );
        expect(git('rev-parse', `${flattened}^{tree}`)).toBe(tree);
        expect(git('show', '-s', '--format=%P', flattened)).toBe(parent);
        json('.tmp/dropped-base-parent.json', { sha: flattened, tree: { sha: tree }, parents: [{ sha: parent }] });
        const rejected = invoke(cli, 'publication', '.tmp/run', '.tmp/dropped-base-parent.json');
        expect(rejected.status).not.toBe(0);
        expect(rejected.stderr).toContain('Remote parents do not inherit the prepared review base.');
        json('.tmp/unreadable-parent.json', {
          sha: head,
          tree: { sha: tree },
          parents: [{ sha: parent }, { sha: '0'.repeat(40) }],
        });
        const unreadable = invoke(cli, 'publication', '.tmp/run', '.tmp/unreadable-parent.json');
        expect(unreadable.status).not.toBe(0);
        expect(unreadable.stderr).toContain('Cannot verify remote parent ancestry:');
      }
      // The transport fixture uses an actual local Git commit, not a claimed GitHub publication.
      json('.tmp/actual-commit.json', { sha: head, tree: { sha: tree }, parents });
      expect(invoke(cli, 'publication', '.tmp/run', '.tmp/actual-commit.json').status).toBe(0);
      expect(read('.tmp/run/publication.json').parent).toBe(parent);
      const snapshot = {
        number: 71,
        title: '[local-agent] execution fixture',
        state: 'OPEN',
        isDraft: false,
        headRefName: 'feat/issue-68',
        headRefOid: head,
        headRepository: { nameWithOwner: 'ZWkang/nodebraid' },
        baseRefName: 'main',
        baseRefOid: base,
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
        reviewDecision: '',
        feedback: [],
        threads: [],
        statusCheckRollup: [
          { name: 'checks', workflowName: 'Checks', headSha: head, status: 'COMPLETED', conclusion: 'SUCCESS' },
        ],
      };
      json('.tmp/snapshot.json', snapshot);
      expect(JSON.parse(invoke(cli, 'evaluate', '.tmp/run', '.tmp/snapshot.json').stdout).status).toBe('ready');
      json('.tmp/snapshot.json', { ...snapshot, baseRefOid: mode === 'initial' ? '0'.repeat(40) : parent });
      expect(JSON.parse(invoke(cli, 'evaluate', '.tmp/run', '.tmp/snapshot.json').stdout).status).toBe(
        'waiting-verification',
      );
      expect(invoke(preview, '--base', base, '--out', join(root, '.tmp/evidence')).status).toBe(0);
      const generated = invoke(report, join(root, '.tmp/run'), join(root, '.tmp/evidence'));
      if (generated.status !== 0) throw new Error(generated.stderr);
      expect(read('.tmp/evidence/preview.json').source.base).toBe(base);
      expect(read('.tmp/evidence/report.json').source.base).toBe(base);
      expect(read('.tmp/evidence/report.json').source.expectedParent).toBe(parent);
      expect(invoke(publisher, 'prepare', join(root, '.tmp/evidence'), 'ZWkang/nodebraid', '71', head).status).toBe(0);
      expect(read('.tmp/evidence/publication-input.json').source.base).toBe(base);
    } finally {
      rmSync(root, { recursive: true });
    }
  },
);
