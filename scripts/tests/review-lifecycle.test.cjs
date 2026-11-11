'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validateReview, REVIEW_SCHEMA } = require('../lib/review-lifecycle.cjs');
const { checkSchema, validate } = require('../lib/eval-contracts.cjs');

const REVISION = 'git:' + 'a'.repeat(40);
const TIME = '2026-11-10T10:00:00+08:00';

function round(id, kind, overrides = {}) {
  return {
    id, kind, status: 'completed', reviewed_revision: REVISION,
    started_at: TIME, completed_at: TIME, summary: kind + ' review',
    requirements_reviewed: ['REQ-001'], requirement_updates: [],
    finding_events: [], evidence: [], ...overrides
  };
}

function baseReview() {
  return {
    schema_version: 1,
    review_id: 'REV-20261110-ABC123',
    title: 'Order module design review',
    status: 'completed',
    created_at: TIME,
    updated_at: TIME,
    baseline: {
      requirements_source: { path: 'docs/plan.md', sha256: 'b'.repeat(64) },
      git_head: 'a'.repeat(40),
      scope: ['src/order', 'tests/order']
    },
    requirements: [{
      id: 'REQ-001',
      statement: 'Order creation must be idempotent.',
      priority: 'must',
      acceptance_criteria: ['Repeated request does not create duplicate orders.'],
      status: 'satisfied',
      evidence: ['test:OrderServiceTest#duplicateRequest'],
      implementation_refs: ['src/order/OrderService.java#L40-L60'],
      validation_ids: ['VAL-001'],
      supersedes: null
    }],
    findings: [],
    decisions: [],
    rounds: [
      round('R01', 'initial', {
        requirement_updates: [{
          requirement_id: 'REQ-001', from_status: 'not_assessed', to_status: 'satisfied',
          reason: 'Design and test contract cover idempotency.',
          evidence: ['doc:docs/plan.md#idempotency']
        }]
      }),
      round('R02', 'challenge'),
      round('R03', 'final')
    ],
    validations: [{
      id: 'VAL-001', kind: 'test', required: true,
      command: 'node --test tests/order.test.cjs',
      status: 'passed', exit_code: 0, revision: REVISION,
      evidence: ['test:OrderServiceTest#duplicateRequest'], executed_at: TIME
    }],
    final: {
      verdict: 'PASS', reviewed_revision: REVISION, generated_at: TIME,
      summary: 'All mandatory requirements and required validations are satisfied.',
      user_acceptance: 'pending'
    }
  };
}

function addFinding(review, finding, events, decisions = []) {
  review.findings.push(finding);
  review.decisions.push(...decisions);
  for (const event of events) {
    const target = review.rounds.find((item) => item.id === event.round);
    target.finding_events.push({
      finding_id: finding.id,
      from_status: event.from_status,
      to_status: event.to_status,
      reason: event.reason || 'State changed after evidence review.',
      evidence: event.evidence || ['review:evidence']
    });
  }
  return review;
}

function finding(overrides = {}) {
  return {
    id: 'F-001',
    title: 'Potential duplicate order under concurrent requests',
    classification: 'source_risk',
    severity: 'medium',
    risk_domain: 'functional',
    status: 'open',
    linked_requirements: ['REQ-001'],
    discovered_round: 'R01',
    root_cause: {
      status: 'likely',
      statement: 'The idempotency check may occur before the transaction boundary.',
      evidence: ['source:src/order/OrderService.java#L40-L60'],
      counter_evidence: []
    },
    resolution: { summary: '', evidence: [], verified_at_revision: null },
    decision_id: null,
    ...overrides
  };
}

test('review schema uses only supported deterministic schema keywords', () => {
  assert.doesNotThrow(() => checkSchema(REVIEW_SCHEMA));
  assert.deepEqual(validate(baseReview(), REVIEW_SCHEMA), []);
});

test('a complete initial/challenge/final review derives PASS', () => {
  const result = validateReview(baseReview());
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.verdict, 'PASS');
});

test('round IDs must be continuous and ordered', () => {
  const review = baseReview();
  review.rounds[1].id = 'R03';
  assert.ok(validateReview(review).errors.some((item) => item.includes('continuous')));
});

test('a satisfied requirement must cite evidence', () => {
  const review = baseReview();
  review.requirements[0].evidence = [];
  assert.ok(validateReview(review).errors.some((item) => item.includes('satisfied without evidence')));
});

test('a final PASS cannot hide an unsatisfied mandatory requirement', () => {
  const review = baseReview();
  review.requirements[0].status = 'unsatisfied';
  review.rounds[0].requirement_updates[0].to_status = 'unsatisfied';
  review.final.verdict = 'PASS';
  const result = validateReview(review);
  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.errors.some((item) => item.includes('verdict mismatch')));
});

test('finalization requires an independent challenge and a distinct final round', () => {
  const review = baseReview();
  review.rounds[1].kind = 'fix';
  assert.ok(validateReview(review).errors.some((item) => item.includes('challenge round')));
});

test('a finding must preserve a continuous state-event history', () => {
  const review = baseReview();
  addFinding(review, finding(), [
    { round: 'R01', from_status: null, to_status: 'open' }
  ]);
  review.final.verdict = 'BLOCKED';
  const result = validateReview(review);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.verdict, 'BLOCKED');
});

test('a regression reopens the same finding ID and prevents PASS', () => {
  const review = baseReview();
  const item = finding({
    classification: 'confirmed_defect',
    status: 'open',
    root_cause: {
      status: 'confirmed',
      statement: 'The uniqueness check is outside the transaction.',
      evidence: ['source:src/order/OrderService.java#L40-L60'],
      counter_evidence: ['test:single-thread-only']
    },
    resolution: {
      summary: 'A prior patch moved the check into the transaction.',
      evidence: ['test:OrderServiceTest#concurrentDuplicate'],
      verified_at_revision: REVISION
    }
  });
  addFinding(review, item, [
    { round: 'R01', from_status: null, to_status: 'open' },
    { round: 'R02', from_status: 'open', to_status: 'fixed_pending_verification' },
    { round: 'R02', from_status: 'fixed_pending_verification', to_status: 'verified_closed' },
    { round: 'R03', from_status: 'verified_closed', to_status: 'open', reason: 'The final concurrency review found a regression.' }
  ]);
  review.final.verdict = 'FAIL';
  const result = validateReview(review);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.verdict, 'FAIL');
});

test('verified_closed requires confirmed root cause and resolution evidence', () => {
  const review = baseReview();
  const item = finding({
    status: 'verified_closed',
    root_cause: { status: 'unknown', statement: '', evidence: [], counter_evidence: [] },
    resolution: { summary: 'Fixed', evidence: [], verified_at_revision: REVISION }
  });
  addFinding(review, item, [
    { round: 'R01', from_status: null, to_status: 'open' },
    { round: 'R02', from_status: 'open', to_status: 'verified_closed' }
  ]);
  review.final.verdict = 'PASS';
  const result = validateReview(review);
  assert.ok(result.errors.some((item) => item.includes('cannot close before root cause')));
  assert.ok(result.errors.some((item) => item.includes('requires resolution evidence')));
});

test('accepted risk requires a linked explicit user decision and derives PASS_WITH_ACCEPTED_RISKS', () => {
  const review = baseReview();
  const decision = {
    id: 'DEC-001', target_type: 'finding', target_id: 'F-001', type: 'accept_risk',
    rationale: 'The residual issue affects diagnostics only.',
    impact: 'Low impact; no business data changes.',
    likelihood: 'Low under the documented deployment topology.',
    mitigation: ['Retain request correlation logs.'],
    residual_risk: 'Troubleshooting may take longer.',
    approved_by: 'user', approver_role: 'user', approved_at: TIME,
    expires_at: null, revisit_condition: 'Revisit during observability upgrade.'
  };
  const item = finding({ status: 'accepted_risk', decision_id: 'DEC-001' });
  addFinding(review, item, [
    { round: 'R01', from_status: null, to_status: 'open' },
    { round: 'R02', from_status: 'open', to_status: 'accepted_risk', reason: 'User approved the documented residual risk.' }
  ], [decision]);
  review.final.verdict = 'PASS_WITH_ACCEPTED_RISKS';
  const result = validateReview(review);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.verdict, 'PASS_WITH_ACCEPTED_RISKS');
});

test('an accepted-risk status without a user decision is rejected', () => {
  const review = baseReview();
  addFinding(review, finding({ status: 'accepted_risk', decision_id: null }), [
    { round: 'R01', from_status: null, to_status: 'open' },
    { round: 'R02', from_status: 'open', to_status: 'accepted_risk' }
  ]);
  review.final.verdict = 'PASS_WITH_ACCEPTED_RISKS';
  assert.ok(validateReview(review).errors.some((item) => item.includes('explicit linked user decision')));
});

test('critical or security findings cannot use the standard accepted-risk path', () => {
  const review = baseReview();
  const decision = {
    id: 'DEC-001', target_type: 'finding', target_id: 'F-001', type: 'accept_risk',
    rationale: 'Attempted waiver.', impact: 'Potential data exposure.', likelihood: 'Unknown.',
    mitigation: ['Monitor logs.'], residual_risk: 'Data may be exposed.',
    approved_by: 'user', approver_role: 'user', approved_at: TIME,
    expires_at: null, revisit_condition: 'Next release.'
  };
  addFinding(review, finding({
    severity: 'high', risk_domain: 'security', status: 'accepted_risk', decision_id: 'DEC-001'
  }), [
    { round: 'R01', from_status: null, to_status: 'open' },
    { round: 'R02', from_status: 'open', to_status: 'accepted_risk' }
  ], [decision]);
  review.final.verdict = 'PASS_WITH_ACCEPTED_RISKS';
  assert.ok(validateReview(review).errors.some((item) => item.includes('not eligible for the standard risk acceptance')));
});

test('a required validation that was not run derives BLOCKED', () => {
  const review = baseReview();
  review.validations.push({
    id: 'VAL-002', kind: 'test', required: true, command: 'npm test',
    status: 'not_run', exit_code: null, revision: REVISION, evidence: [], executed_at: TIME
  });
  review.final.verdict = 'BLOCKED';
  const result = validateReview(review);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.verdict, 'BLOCKED');
});

test('final evidence becomes stale when the caller supplies a different current revision', () => {
  const result = validateReview(baseReview(), { currentRevision: 'git:' + 'c'.repeat(40) });
  assert.ok(result.errors.some((item) => item.includes('workspace revision drift')));
});

test('requirement state cannot jump over an unrecorded transition', () => {
  const review = baseReview();
  review.rounds[0].requirement_updates[0].from_status = 'satisfied';
  assert.ok(validateReview(review).errors.some((item) => item.includes('state transition expected from')));
});

test('excluded findings require counter-evidence', () => {
  const review = baseReview();
  const item = finding({
    classification: 'excluded', status: 'rejected_with_evidence',
    root_cause: { status: 'not_applicable', statement: 'Guard prevents the path.', evidence: [], counter_evidence: [] }
  });
  addFinding(review, item, [
    { round: 'R01', from_status: null, to_status: 'rejected_with_evidence' }
  ]);
  review.final.verdict = 'PASS';
  assert.ok(validateReview(review).errors.some((item) => item.includes('requires counter-evidence')));
});

test('CLI init creates a ledger without overwriting existing workspace data', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'code-pact-review-init-'));
  try {
    fs.mkdirSync(path.join(workspace, 'docs'));
    fs.writeFileSync(path.join(workspace, 'docs', 'plan.md'), '# Review plan\n');
    const cli = path.resolve(__dirname, '..', 'review-lifecycle.cjs');
    const result = spawnSync(process.execPath, [
      cli, 'init', '--title', 'Sample review', '--source', 'docs/plan.md', '--scope', 'src,tests'
    ], { cwd: workspace, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const ledgerFiles = [];
    const root = path.join(workspace, '.code-pact', 'reviews');
    for (const entry of fs.readdirSync(root)) {
      const candidate = path.join(root, entry, 'review.json');
      if (fs.existsSync(candidate)) ledgerFiles.push(candidate);
    }
    assert.equal(ledgerFiles.length, 1);
    const ledger = JSON.parse(fs.readFileSync(ledgerFiles[0], 'utf8'));
    assert.equal(ledger.status, 'active');
    assert.equal(ledger.baseline.requirements_source.sha256,
      require('node:crypto').createHash('sha256').update('# Review plan\n').digest('hex'));
    assert.equal(fs.existsSync(path.join(workspace, 'docs', 'plan.md')), true);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('final PASS is blocked when no required validation exists', () => {
  const review=baseReview();
  review.validations=[];
  const result=validateReview(review);
  assert.equal(result.verdict,'BLOCKED');
  assert.ok(result.errors.some(message=>message.includes('requires at least one required validation')));
});

test('mandatory requirement cannot be accepted as deferred', () => {
  const review=baseReview();
  review.requirements[0].status='deferred';
  review.rounds[0].requirement_updates[0].to_status='deferred';
  review.requirements[0].evidence=[];
  review.decisions.push({
    id:'DEC-001',target_type:'requirement',target_id:'REQ-001',type:'defer',
    rationale:'Cannot implement yet',impact:'No feature',likelihood:'Certain',
    mitigation:['Implement after investigation'],residual_risk:'Core feature missing',
    approved_by:'user',approver_role:'user',approved_at:TIME,
    expires_at:null,revisit_condition:'Next iteration'
  });
  review.final.verdict='FAIL';
  const result=validateReview(review);
  assert.equal(result.verdict,'FAIL');
  assert.ok(result.errors.some(message=>message.includes('mandatory requirement cannot be deferred')));
});

test('old revision passing validation blocks final verdict', () => {
  const review=baseReview();
  review.validations[0].revision='git:'+'c'.repeat(40);
  review.final.verdict='BLOCKED';
  const result=validateReview(review);
  assert.equal(result.verdict,'BLOCKED');
  assert.ok(result.errors.some(message=>message.includes('required validation uses a stale revision')));
});

test('cannot jump from OPEN directly to VERIFIED_CLOSED', () => {
  const review=baseReview();
  const item=finding({
    classification:'confirmed_defect',
    status:'verified_closed',
    root_cause:{status:'confirmed',statement:'A verified cause',evidence:['source:fix'],counter_evidence:['test:counter']},
    resolution:{summary:'Corrected',evidence:['test:regression'],verified_at_revision:REVISION}
  });
  addFinding(review,item,[
    {round:'R01',from_status:null,to_status:'open'},
    {round:'R02',from_status:'open',to_status:'verified_closed'}
  ]);
  assert.ok(validateReview(review).errors.some(message=>message.includes('illegal finding transition')));
});

test('expired accepted risk cannot be reused without reassessment', () => {
  const review=baseReview();
  const decision={
    id:'DEC-001',target_type:'finding',target_id:'F-001',type:'accept_risk',
    rationale:'Temporary waiver',impact:'Minor',likelihood:'Low',
    mitigation:['Monitor'],residual_risk:'Small residual exposure',
    approved_by:'user',approver_role:'user',approved_at:'2024-01-01T00:00:00Z',
    expires_at:'2024-02-01T00:00:00Z',revisit_condition:'Next review'
  };
  addFinding(review,finding({status:'accepted_risk',decision_id:'DEC-001'}),[
    {round:'R01',from_status:null,to_status:'open'},
    {round:'R02',from_status:'open',to_status:'accepted_risk'}
  ],[decision]);
  review.final.verdict='PASS_WITH_ACCEPTED_RISKS';
  assert.ok(validateReview(review).errors.some(message=>message.includes('risk acceptance has expired')));
});

test('all findings need a valid initial opening event', () => {
  const review=baseReview();
  addFinding(review,finding({status:'verified_closed'}),[
    {round:'R01',from_status:null,to_status:'verified_closed'}
  ]);
  assert.ok(validateReview(review).errors.some(message=>message.includes('illegal finding transition')));
});

test('CLI detects changed source document from its frozen SHA-256 baseline', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'code-pact-source-drift-'));
  try {
    fs.mkdirSync(path.join(workspace,'docs'));
    const source=path.join(workspace,'docs','plan.md');
    fs.writeFileSync(source,'# Initial requirement\n');
    const cli=path.resolve(__dirname,'..','review-lifecycle.cjs');
    const result=spawnSync(process.execPath,[cli,'init','--title','Source drift','--source','docs/plan.md','--scope','src'],{cwd:workspace,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const root=path.join(workspace,'.code-pact','reviews');
    const id=fs.readdirSync(root)[0];
    const ledger=path.join('.code-pact','reviews',id,'review.json');
    const before=spawnSync(process.execPath,[cli,'validate',ledger],{cwd:workspace,encoding:'utf8'});
    assert.equal(before.status,0,before.stderr);
    fs.writeFileSync(source,'# Changed requirement\n');
    const after=spawnSync(process.execPath,[cli,'validate',ledger],{cwd:workspace,encoding:'utf8'});
    assert.equal(after.status,1);
    assert.match(after.stderr,/requirement baseline SHA-256 drift/);
  } finally {
    fs.rmSync(workspace,{recursive:true,force:true});
  }
});

test('mandatory satisfied requirement without validation linkage cannot PASS', () => {
  const review = baseReview();
  review.requirements[0].validation_ids = [];
  review.final.verdict = 'BLOCKED';
  const result = validateReview(review);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.verdict, 'BLOCKED');
  assert.ok(result.reasons.some(reason => reason.includes('no linked validation evidence')));
});

test('unknown validation ID in a requirement is rejected even before finalization', () => {
  const review = baseReview();
  review.requirements[0].validation_ids = ['VAL-999'];
  review.final.verdict = 'BLOCKED';
  assert.ok(validateReview(review).errors.some(reason => reason.includes('references unknown validation VAL-999')));
});

test('generated Markdown report shows concrete requirement, validation, and round evidence', () => {
  const { renderReviewReport } = require('../lib/review-report.cjs');
  const review = baseReview();
  review.requirements[0].statement = 'Creation must be idempotent | audited';
  const result = validateReview(review);
  assert.equal(result.valid, true, result.errors.join('\n'));
  const md = renderReviewReport(review, result);
  assert.match(md, /门禁结论：PASS/);
  assert.match(md, /REQ-001/);
  assert.match(md, /VAL-001\(passed\)/);
  assert.match(md, /idempotent \\\| audited/);
  assert.match(md, /R02/);
  assert.match(md, /最终门禁依据与限制/);
});

test('CLI report writes immutable final-report.md only for valid finalized ledger', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'code-pact-report-export-'));
  try {
    fs.mkdirSync(path.join(workspace, 'docs'));
    fs.writeFileSync(path.join(workspace, 'docs', 'plan.md'), '# Case plan\n');
    const review = baseReview();
    review.baseline.git_head = null;
    review.baseline.requirements_source.sha256 =
      require('node:crypto').createHash('sha256').update('# Case plan\n').digest('hex');
    const reviewFolder = path.join(workspace, '.code-pact', 'reviews', review.review_id);
    fs.mkdirSync(reviewFolder, {recursive:true});
    const relative = path.join('.code-pact','reviews',review.review_id,'review.json');
    fs.writeFileSync(path.join(workspace, relative), JSON.stringify(review,null,2));
    const cli = path.resolve(__dirname,'..','review-lifecycle.cjs');
    const run = (args) => spawnSync(process.execPath,[cli,'report',relative,...args],
      {cwd:workspace,encoding:'utf8'});
    const stdout = run([]);
    assert.equal(stdout.status,0,stdout.stderr);
    assert.match(stdout.stdout,/REQ-001/);
    assert.equal(fs.existsSync(path.join(reviewFolder,'final-report.md')),false);
    const first = run(['--write']);
    assert.equal(first.status,0,first.stderr);
    const saved = fs.readFileSync(path.join(reviewFolder,'final-report.md'),'utf8');
    assert.match(saved,/PASS/);
    const second = run(['--write']);
    assert.equal(second.status,1);
    assert.match(second.stderr,/EEXIST/);
    assert.equal(fs.readFileSync(path.join(reviewFolder,'final-report.md'),'utf8'),saved);
  } finally {
    fs.rmSync(workspace,{recursive:true,force:true});
  }
});

test('real V2.2 plan MD can drive a three-round rehearsal and stays BLOCKED when Agent tests are unrun', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'code-pact-real-plan-rehearsal-'));
  try {
    const file='docs/roadmap/code-pact-v2.2-direction.md';
    fs.mkdirSync(path.join(workspace,'docs','roadmap'),{recursive:true});
    fs.copyFileSync(path.resolve(__dirname,'..','..',file),path.join(workspace,file));
    const cli=path.resolve(__dirname,'..','review-lifecycle.cjs');
    const init=spawnSync(process.execPath,[cli,'init','--title','V2.2 评审闭环演练',
      '--source',file,'--scope','scripts,evals'],{cwd:workspace,encoding:'utf8'});
    assert.equal(init.status,0,init.stderr);
    const directory = path.join(workspace,'.code-pact','reviews',
      fs.readdirSync(path.join(workspace,'.code-pact','reviews'))[0]);
    const filename=path.join(directory,'review.json');
    const review=JSON.parse(fs.readFileSync(filename,'utf8'));
    const revision='plan-sha256:'+review.baseline.requirements_source.sha256;
    review.requirements=[
      {id:'REQ-001',statement:'Review Lifecycle preserves stable IDs and continuous rounds',
        priority:'must',acceptance_criteria:['ID stable across rounds'],status:'satisfied',
        evidence:['references/review-lifecycle-contract.md#Stable identities'],
        implementation_refs:['scripts/lib/review-lifecycle.cjs'],
        validation_ids:[],supersedes:null},
      {id:'REQ-002',statement:'True agent behavior evaluation covers round reviews',
        priority:'must',acceptance_criteria:['Real agent runs have evidence'],status:'blocked',
        evidence:[],implementation_refs:[],validation_ids:['VAL-001'],supersedes:null}
    ];
    const now='2026-11-10T10:00:00+08:00';
    const baseRound=(id,kind,extra={})=>({
      id,kind,status:'completed',reviewed_revision:revision,started_at:now,completed_at:now,
      summary:kind+' (simulation with actual plan document)',
      requirements_reviewed:['REQ-001','REQ-002'],requirement_updates:[],finding_events:[],
      evidence:[],...extra
    });
    review.rounds=[
      baseRound('R01','initial',{
        requirement_updates:[
          {requirement_id:'REQ-001',from_status:'not_assessed',to_status:'satisfied',
            reason:'Contract and source implementation references exist',evidence:['reference:contract']},
          {requirement_id:'REQ-002',from_status:'not_assessed',to_status:'blocked',
            reason:'No real agent execution logs were supplied',evidence:[]}
        ]
      }),
      baseRound('R02','challenge',{
        finding_events:[{finding_id:'F-001',from_status:null,to_status:'open',
          reason:'Independent review has not actually been executed',evidence:['evals/manual-evaluation.md']}]
      }),
      baseRound('R03','final')
    ];
    review.findings=[{
      id:'F-001',title:'Real agent evaluations remain unexecuted',
      classification:'test_gap',severity:'medium',risk_domain:'functional',
      status:'open',linked_requirements:['REQ-002'],discovered_round:'R02',
      root_cause:{status:'unknown',statement:'',evidence:[],counter_evidence:[]},
      resolution:{summary:'',evidence:[],verified_at_revision:null},decision_id:null
    }];
    review.validations=[{
      id:'VAL-001',kind:'manual',required:true,command:'Run V2-C21..V2-C27 in real Coding Agents',
      status:'not_run',exit_code:null,revision,evidence:[],executed_at:now
    }];
    review.status='completed';
    review.final={verdict:'BLOCKED',reviewed_revision:revision,generated_at:now,
      summary:'Rehearsal only; genuine agent behavior evidence is missing.',
      user_acceptance:'pending'};
    fs.writeFileSync(filename,JSON.stringify(review,null,2));
    const relative=path.relative(workspace,filename);
    const run=spawnSync(process.execPath,[cli,'report',relative],{cwd:workspace,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    assert.match(run.stdout,/BLOCKED/);
    assert.match(run.stdout,/REQ-002/);
    assert.match(run.stdout,/F-001/);
    assert.match(run.stdout,/VAL-001\(not_run\)/);
    assert.match(run.stdout,/R01/);
    assert.match(run.stdout,/R02/);
    assert.match(run.stdout,/R03/);
  } finally {
    fs.rmSync(workspace,{recursive:true,force:true});
  }
});
