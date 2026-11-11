'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { validateReview, isInside } = require('./lib/review-lifecycle.cjs');
const { renderReviewReport } = require('./lib/review-report.cjs');

function parseArgs(args) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = args[index + 1];
    if (next === undefined || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return { options, positionals };
}

function workspaceFile(workspaceRoot, input) {
  const target = path.resolve(workspaceRoot, input);
  if (!isInside(workspaceRoot, target)) throw new Error('Path must stay inside the target project workspace');
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('File does not exist: ' + input);
  const realRoot = fs.realpathSync(workspaceRoot);
  const realTarget = fs.realpathSync(target);
  if (!isInside(realRoot, realTarget)) throw new Error('Symlink escapes the target project workspace: ' + input);
  return target;
}

function currentGitHead(workspaceRoot) {
  try {
    const value = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspaceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^[a-fA-F0-9]{40}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function assertSafeReviewRoot(workspaceRoot, reviewRoot) {
  const workspaceReal = fs.realpathSync(workspaceRoot);
  let existing = reviewRoot;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) throw new Error('Cannot locate an existing workspace ancestor');
    existing = parent;
  }
  const existingReal = fs.realpathSync(existing);
  if (existingReal !== workspaceReal && !isInside(workspaceReal, existingReal)) {
    throw new Error('Review root resolves outside the workspace (possible symlink or junction)');
  }
}

function init(workspaceRoot, options) {
  const title = options.title;
  const source = options.source;
  const scope = String(options.scope || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (typeof title !== 'string' || !title.trim()) throw new Error('init requires --title "review title"');
  if (typeof source !== 'string' || !source.trim()) throw new Error('init requires --source <requirements document path>');
  if (scope.length === 0) throw new Error('init requires --scope "path1,path2"');

  const sourceFile = workspaceFile(workspaceRoot, source);
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
  const now = new Date().toISOString();
  const date = now.slice(0, 10).replace(/-/g, '');
  const reviewId = 'REV-' + date + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const reviewRoot = path.resolve(workspaceRoot, options['review-root'] || '.code-pact/reviews');
  if (!isInside(workspaceRoot, reviewRoot)) throw new Error('--review-root must stay inside the target project workspace');
  assertSafeReviewRoot(workspaceRoot, reviewRoot);
  const sessionDirectory = path.join(reviewRoot, reviewId);

  fs.mkdirSync(reviewRoot, { recursive: true });
  assertSafeReviewRoot(workspaceRoot, reviewRoot);
  fs.mkdirSync(sessionDirectory);
  fs.mkdirSync(path.join(sessionDirectory, 'rounds'));
  fs.mkdirSync(path.join(sessionDirectory, 'evidence'));

  const ledger = {
    schema_version: 1,
    review_id: reviewId,
    title: title.trim(),
    status: 'active',
    created_at: now,
    updated_at: now,
    baseline: {
      requirements_source: { path: path.relative(workspaceRoot, sourceFile).replace(/\\/g, '/'), sha256: sourceHash },
      git_head: currentGitHead(workspaceRoot),
      scope
    },
    requirements: [],
    findings: [],
    decisions: [],
    rounds: [],
    validations: [],
    final: null
  };

  const ledgerPath = path.join(sessionDirectory, 'review.json');
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', { flag: 'wx' });
  console.log('Created Review Session: ' + reviewId);
  console.log('Ledger: ' + path.relative(workspaceRoot, ledgerPath).replace(/\\/g, '/'));
  console.log('Baseline SHA-256: ' + sourceHash);
  console.log('Next: extract REQ items from the source document, then append R01.');
}

function readLedger(workspaceRoot, input) {
  if (!input) throw new Error('A project-relative review.json path is required');
  const file = workspaceFile(workspaceRoot, input);
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error('Invalid review JSON: ' + error.message);
  }
  return { file, ledger };
}

function report(workspaceRoot, command, input, options) {
  const { file, ledger } = readLedger(workspaceRoot, input);
  const explicitRevision = typeof options['current-revision'] === 'string' ? options['current-revision'] : undefined;
  const observedGitHead = ledger.final ? currentGitHead(workspaceRoot) : null;
  const currentRevision = explicitRevision || (observedGitHead ? 'git:' + observedGitHead : undefined);
  const result = validateReview(ledger, { currentRevision });
  const requirementSource = ledger.baseline?.requirements_source;
  if (requirementSource?.path) {
    try {
      const sourceFile = workspaceFile(workspaceRoot, requirementSource.path);
      const actualSha = crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
      if (actualSha.toLowerCase() !== String(requirementSource.sha256).toLowerCase()) {
        result.errors.push('requirement baseline SHA-256 drift: original plan changed; create another review round');
      }
    } catch (error) {
      result.errors.push('requirement baseline cannot be checked: ' + error.message);
    }
  }
  result.valid = result.errors.length === 0;
  if (!result.valid) {
    console.error('REVIEW_LEDGER_INVALID');
    for (const error of result.errors) console.error('- ' + error);
    process.exitCode = 1;
    return;
  }

  if (command === 'report') {
    if (options.write !== undefined && options.write !== true) {
      throw new Error('report --write does not take a value');
    }
    if (options.write && !ledger.final) {
      throw new Error('Refusing to write final-report.md: review is not finalized');
    }
    const markdown = renderReviewReport(ledger, result);
    if (options.write) {
      // Only publish next to the validated ledger; never overwrite a previous report.
      const output = path.join(path.dirname(file), 'final-report.md');
      fs.writeFileSync(output, markdown, { encoding: 'utf8', flag: 'wx' });
      console.log('Created non-overwriting report: ' + path.relative(workspaceRoot, output));
    } else {
      process.stdout.write(markdown);
    }
    return;
  }
  const relative = path.relative(workspaceRoot, file).replace(/\\/g, '/');
  const requirements = ledger.requirements || [];
  const findings = ledger.findings || [];
  const counts = (items, field, value) => items.filter((item) => item[field] === value).length;
  console.log('Review ledger valid: ' + ledger.review_id);
  console.log('File: ' + relative);
  console.log('Status: ' + ledger.status + ' | Verdict: ' + result.verdict);
  console.log('Requirements: ' + requirements.length +
    ' (satisfied=' + counts(requirements, 'status', 'satisfied') +
    ', unsatisfied=' + counts(requirements, 'status', 'unsatisfied') +
    ', blocked=' + counts(requirements, 'status', 'blocked') + ')');
  console.log('Findings: ' + findings.length +
    ' (closed=' + counts(findings, 'status', 'verified_closed') +
    ', accepted_risk=' + counts(findings, 'status', 'accepted_risk') +
    ', deferred=' + counts(findings, 'status', 'deferred') + ')');
  console.log('Rounds: ' + (ledger.rounds || []).length + ' | Validations: ' + (ledger.validations || []).length);
  if (result.reasons.length) {
    console.log('Gate reasons:');
    for (const reason of result.reasons) console.log('- ' + reason);
  }
  if (!currentRevision && ledger.final) {
    console.log('Note: Git revision was unavailable; supply --current-revision to check external version drift.');
  }
  if (command === 'summary') console.log('Final summary: ' + (ledger.final?.summary || 'Review is still in progress.'));
}

function main() {
  const workspaceRoot = process.cwd();
  const [command, ...args] = process.argv.slice(2);
  const { options, positionals } = parseArgs(args);

  if (command === 'init') return init(workspaceRoot, options);
  if (command === 'validate' || command === 'summary' || command === 'report') {
    return report(workspaceRoot, command, positionals[0], options);
  }
  throw new Error(
    'Usage:\n' +
    '  node scripts/review-lifecycle.cjs init --title "..." --source docs/plan.md --scope "src,tests"\n' +
    '  node scripts/review-lifecycle.cjs validate .code-pact/reviews/<id>/review.json [--current-revision "git:<sha>"]\n' +
    '  node scripts/review-lifecycle.cjs summary .code-pact/reviews/<id>/review.json\n' +
    '  node scripts/review-lifecycle.cjs report .code-pact/reviews/<id>/review.json [--write]'
  );
}

try {
  main();
} catch (error) {
  console.error('REVIEW_LIFECYCLE_FAILED: ' + error.message);
  process.exitCode = 1;
}
