'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { routeTask, MODES } = require('../lib/task-router.cjs');

test('all seven task modes are explicitly supported', () => {
  assert.deepEqual(MODES, ['analyze','plan','implement','debug','review','verify','release']);
});

const cases = [
  ['分析项目', ['analyze'], 'analyze'],
  ['/code-pact 分析项目', ['analyze'], 'analyze'],
  ['$code-pact 梳理项目架构', ['analyze'], 'analyze'],
  ['审计当前代码', ['review'], 'review'],
  ['评审这个设计方案', ['review'], 'review'],
  ['制定订单模块改造方案', ['plan'], 'plan'],
  ['根据 docs/改造实施方案.md 进行实施、测试和验收', ['implement','verify'], 'implement'],
  ['根据方案MD实施、测试、验收并复审', ['review','implement','verify'], 'review'],
  ['修复这个bug', ['debug','implement'], 'debug'],
  ['定位系统故障根因', ['debug'], 'debug'],
  ['验证功能验收结果', ['verify'], 'verify'],
  ['发布上线', ['release'], 'release'],
  ['implement and test the new endpoint', ['implement','verify'], 'implement'],
  ['release after tests', ['verify','release'], 'verify']
];

for (const [prompt, expectedModes, primary] of cases) {
  test('task route: ' + prompt, () => {
    const actual = routeTask(prompt);
    assert.deepEqual(actual.modes, expectedModes);
    assert.equal(actual.primary_mode, primary);
    assert.equal(actual.task_level, 'assess_from_repository');
  });
}

test('multi-round review requests durable Review Lifecycle', () => {
  const actual = routeTask('/code-pact 持续多轮评审这个方案，直到逐项验收');
  assert.equal(actual.review_lifecycle, true);
  assert.equal(actual.requirement_traceability, true);
  assert.ok(actual.modes.includes('review'));
});

test('simple one-shot review does not enable durable state', () => {
  const actual = routeTask('/code-pact 评审这次代码改动');
  assert.equal(actual.review_lifecycle, false);
  assert.equal(actual.requirement_traceability, false);
});

test('plan-driven implementation and acceptance enable traceability without unnecessary planning', () => {
  const actual = routeTask('根据 docs/实施方案.md 实施、测试和验收');
  assert.equal(actual.source_document_mentioned, true);
  assert.equal(actual.requirement_traceability, true);
  assert.equal(actual.modes.includes('plan'), false);
});

test('negated implementation is not authorization for a write', () => {
  const actual = routeTask('分析项目，不要实施');
  assert.deepEqual(actual.modes, ['analyze']);
  assert.equal(actual.primary_mode, 'analyze');
});

test('release mode is never external-write authorization', () => {
  const actual = routeTask('推送 GitHub');
  assert.equal(actual.primary_mode, 'release');
  assert.equal(actual.approval_required_for_external_mutation, true);
  assert.ok(actual.caveats.some((s) => s.includes('matching authorization')));
});

test('explicit mode wins over inferred mode', () => {
  const actual = routeTask('分析架构并评审', { mode:'analyze' });
  assert.equal(actual.primary_mode, 'analyze');
  assert.deepEqual(actual.modes, ['analyze','review']);
});

test('unknown mode and empty inputs fail safely', () => {
  assert.throws(() => routeTask('任务', { mode:'write-all' }), /Unknown explicit mode/);
  assert.equal(routeTask('').status, 'needs_intent');
  assert.equal(routeTask('看看').status, 'needs_intent');
});

test('CLI emits JSON without executing or writing task content', () => {
  const cli = path.resolve(__dirname, '..', 'task-router.cjs');
  const result = spawnSync(process.execPath, [cli, '根据', 'docs/计划.md', '实施、测试、验收'], { encoding:'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.requirement_traceability, true);
  assert.deepEqual(parsed.modes, ['implement','verify']);
});

test('a plan filename is never treated as an instruction to implement', () => {
  const actual = routeTask('评审 docs/实施方案.md');
  assert.deepEqual(actual.modes, ['review']);
  assert.equal(actual.review_lifecycle, false);
});

test('analysis of an implementation plan stays read-only', () => {
  const actual = routeTask('分析 docs/实施方案.md，不要实施');
  assert.deepEqual(actual.modes, ['analyze']);
  assert.equal(actual.approval_required_for_external_mutation, false);
});

test('denied publication does not turn analysis into release', () => {
  const actual = routeTask('分析项目，不要推送');
  assert.deepEqual(actual.modes, ['analyze']);
});

test('a complex request does not cause a predetermined L3 classification', () => {
  const actual = routeTask('根据 docs/方案.md 实施、测试、验收并持续多轮复审');
  assert.equal(actual.task_level, 'assess_from_repository');
  assert.equal(actual.review_lifecycle, true);
  assert.equal(actual.requirement_traceability, true);
});

test('reviewing a refactoring plan is not permission to refactor', () => {
  assert.deepEqual(routeTask('评审改造方案').modes, ['review']);
});

test('reviewing a test strategy is not running tests', () => {
  assert.deepEqual(routeTask('评审测试方案').modes, ['review']);
});

test('planning a test strategy does not claim verification took place', () => {
  assert.deepEqual(routeTask('制定测试计划').modes, ['plan']);
});

test('analyzing a release workflow does not trigger a release', () => {
  assert.deepEqual(routeTask('分析项目的发布流程').modes, ['analyze']);
});

test('an explicit implementation action after review is still retained', () => {
  assert.deepEqual(routeTask('评审改造方案，然后实施').modes, ['review','implement']);
});
