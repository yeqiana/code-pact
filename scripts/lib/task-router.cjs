'use strict';

/**
 * Advisory task routing for Code Pact.
 * This is a deterministic hint generator, NOT semantic understanding, a
 * permission system, a task-level estimator, or an authorization grant.
 * The Coding Agent remains responsible for interpreting the user's intent.
 */

const MODES = Object.freeze(['analyze', 'plan', 'implement', 'debug', 'review', 'verify', 'release']);
const MODE_INFO = Object.freeze({
  analyze: { description: '项目理解、代码与架构分析', default_scope: 'read_only' },
  plan: { description: '需求、方案与验收标准规划', default_scope: 'read_only_unless_document_requested' },
  implement: { description: '开发、修改和重构', default_scope: 'authorized_local_changes' },
  debug: { description: '复现、诊断和根因定位', default_scope: 'diagnose_first; edit_only_with_authorization' },
  review: { description: '设计、代码和安全评审', default_scope: 'read_only_unless_review_records_requested' },
  verify: { description: '测试、回归与逐项验收', default_scope: 'authorized_validation_tools' },
  release: { description: '提交、推送、打包、发布', default_scope: 'external_mutation_requires_authorization' }
});

const PATTERNS = Object.freeze({
  analyze: /分析(?:项目|代码|架构|系统|仓库|现状|模块)|(?:^|[，。；\s])(?:先)?分析(?=\s|[A-Za-z./\\]|$)|梳理(?:项目|架构|代码)|了解(?:项目|架构)|项目分析|analy[sz]e|inspect(?:\s+project)?|explore(?:\s+codebase)?/i,
  plan: /(?:制定|编写|设计|规划)(?:.{0,25})(?:方案|计划|架构|规格|设计)|(?:技术|实施)方案制定|(?:create|write|draft)\s+(?:a\s+)?(?:plan|specification)|\bplan(?:ning)?\b|\bspec(?:ification)?\s+design\b/i,
  implement: /(?:开始|继续|推进|进行|完成)?(?:实施|开发|改造|实现|重构|编码)|修复.{0,5}(?:bug|缺陷|漏洞|问题|错误)|新增(?:功能|接口|组件)|(?:implement|build|develop|refactor|apply\s+changes|fix\s+(?:the\s+)?bug)\b/i,
  debug: /(?:排查|定位|诊断)(?:.{0,15})(?:bug|错误|异常|故障|问题|原因|根因)|根因(?:分析|定位|不清楚)|\bdebug\b|\btroubleshoot\b|\broot\s+cause\b/i,
  review: /(?:设计|架构|代码|安全|多轮|方案)?(?:评审|审计|复审)|(?:审查|检查)(?:代码|安全|设计)|\breview\b|\baudit\b/i,
  verify: /(?:测试|验收|回归|验证|校验)(?:结果|证据|功能|需求|标准)?|(?:跑|运行|执行)(?:.{0,8})(?:测试|验证)|\bverif(?:y|ication)\b|\bvalidat(?:e|ion)\b|\btest(?:ing|s)?\b|\bacceptance\b/i,
  release: /(?:提交并)?(?:推送|部署|发布|上线)|(?:发布|部署|推送)(?:到|至)|创建(?:release|版本标签)|\b(?:release|deploy|publish|git\s+push)\b/i
});

const ORDER = Object.freeze(['analyze', 'plan', 'review', 'debug', 'implement', 'verify', 'release']);

function textOf(value) {
  if (typeof value !== 'string') throw new TypeError('task must be a string');
  return value.replace(/^\s*(?:\/code-pact|\$code-pact)\b[\s:，,：]*/i, '').trim();
}

function negated(text, pattern) {
  const hits = [...text.matchAll(new RegExp(pattern.source, 'gi'))];
  return hits.length > 0 && hits.every((match) => {
    // Negation is local to a clause; "先分析，不要实施" must stay read-only.
    const clause = text.slice(Math.max(0, match.index - 18), match.index).split(/[，。；;、\n]/).pop() || '';
    return /(?:不要|不需要|无需|禁止|别|不得|不允许|不必|do\s+not|don't|without)\s*(?:进行|执行|开始|直接|自动|随意)?\s*$/i.test(clause);
  });
}

function normalizeExplicitMode(mode) {
  if (mode === undefined || mode === null || mode === '') return null;
  if (typeof mode !== 'string' || !MODES.includes(mode.toLowerCase())) {
    throw new Error('Unknown explicit mode. Supported: ' + MODES.join(', '));
  }
  return mode.toLowerCase();
}

function routeTask(task, options = {}) {
  const explicit = normalizeExplicitMode(options.mode);
  const input = textOf(task);
  if (!input) return {
    status: 'needs_intent', input, primary_mode: null, modes: [],
    task_level: 'assess_from_repository', review_lifecycle: false,
    requirement_traceability: false, source_document_mentioned: false,
    approval_required_for_external_mutation: false, mode_info: [],
    caveats: ['Empty task: ask for the intended development or review goal.']
  };

  // File names and paths are source references, not imperative actions.
  const signals = input.replace(/(?:[a-z]:[\\/]|\.{0,2}[\\/]|[\w-]+[\\/])(?:[^\\/\s]+[\\/])*[^\\/\s]+\.(?:md|markdown|txt|json|java|ts|tsx|js|py|yaml|yml)(?:#[^\s]+)?/gi, ' ');
  const modeSignals = {
    ...Object.fromEntries(ORDER.map((mode) => [mode, signals])),
    implement: signals.replace(/(?:改造|实现|开发|实施)方案/g, '方案'),
    verify: signals.replace(/(?:测试|验收)(?:方案|计划|策略|用例)/g, '方案'),
    release: signals.replace(/发布(?:流程|规范|计划|文档)/g, '流程')
  };
  let candidates = ORDER.filter((mode) => PATTERNS[mode].test(modeSignals[mode]) && !negated(modeSignals[mode], PATTERNS[mode]));
  // Nouns in a review title or a plan name are not implementation instructions.
  if (candidates.includes('review') && /(?:评审|审查).{0,20}(?:设计|方案|架构)/.test(input) &&
      !/(?:制定|编写|规划).{0,20}(?:方案|计划|架构)/.test(input)) {
    candidates = candidates.filter((mode) => mode !== 'plan');
  }
  if (candidates.includes('plan') &&
      /(?:制定|编写|规划|设计).{0,30}改造方案/.test(input) &&
      !/(?:实施|执行|开发|重构|编码|修复|实现).{0,15}(?:功能|需求|代码|问题|bug|方案)/.test(input)) {
    candidates = candidates.filter((mode) => mode !== 'implement');
  }
  let modes = explicit ? [explicit, ...candidates.filter((mode) => mode !== explicit)] : candidates;

  // When debugging a requested bug fix, investigation must precede implementation.
  if (/(?:修复.{0,5}(?:bug|缺陷|漏洞|问题|错误)|\bfix\s+(?:the\s+)?bug\b)/i.test(input) &&
      modes.includes('implement') && !modes.includes('debug')) {
    modes = [...modes, 'debug'];
  }

  // A supplied plan is an input, not a request to invent another plan.
  const hasSource = /(?:根据|按照|依照|基于|参考|按)(?:.{0,80}?)(?:方案|计划|\.md\b|markdown\b)|(?:from|based\s+on|following)\s+(?:.{0,60})(?:plan|spec|\.md\b)|(?:docs?[/\\][^\s"'，,；;]+\.md\b)/i.test(input);
  const reviewLifecycle = modes.includes('review') &&
    /(?:多轮|反复|持续|迭代|直到|每一轮|复审|评审闭环|跟踪.{0,8}(?:问题|状态)|multi.round|repeated|until\s+accepted)/i.test(input);
  const traceability = reviewLifecycle ||
    (hasSource && modes.includes('implement') && modes.includes('verify')) ||
    /(?:逐项|全部|每项)(?:验收|核对|对照)|遗漏(?:需求|功能)|需求追溯|验收矩阵/i.test(input);

  // Explicitly named Review has priority over incidental Plan/Analyze references.
  const primaryMode = explicit || (
    modes.includes('release') && modes.length === 1 ? 'release' :
    modes.includes('review') ? 'review' :
    modes.includes('debug') ? 'debug' :
    modes.includes('implement') ? 'implement' :
    modes.includes('verify') ? 'verify' :
    modes.includes('plan') ? 'plan' :
    modes[0] || null
  );

  if (modes.includes('implement') && modes.includes('verify')) {
    // Execute the requested development before its acceptance checks.
    modes = [...modes.filter((mode) => mode !== 'verify'), 'verify'];
    // Release is always after validation, even if the text lists it first.
    modes = [...modes.filter((mode) => mode !== 'release'), ...modes.filter((mode) => mode === 'release')];
  }
  // Debug must run before implementation, regardless of keyword order.
  if (modes.includes('debug') && modes.includes('implement') &&
      modes.indexOf('debug') > modes.indexOf('implement')) {
    modes = [...modes.filter((mode) => mode !== 'debug')];
    modes.splice(modes.indexOf('implement'), 0, 'debug');
  }

  const caveats = [
    'Keyword routing is advisory, not semantic understanding or a permission grant.',
    'Determine L0–L3 separately from change surface, risk, reversibility and repository evidence.',
    'Do not create a durable review ledger for a simple one-shot task.'
  ];
  if (modes.includes('release')) caveats.push('Git push, publishing, deployment and destructive actions require matching authorization.');
  if (hasSource) caveats.push('Read and verify the referenced plan/document before implementation; do not invent acceptance criteria.');
  if (reviewLifecycle) caveats.push('Preserve stable REQ/Finding IDs and rounds; finalize from original requirements and current evidence.');

  return {
    status: modes.length ? 'suggested' : 'needs_intent',
    input, primary_mode: primaryMode, modes,
    task_level: 'assess_from_repository',
    review_lifecycle: reviewLifecycle,
    requirement_traceability: traceability,
    source_document_mentioned: hasSource,
    approval_required_for_external_mutation: modes.includes('release'),
    mode_info: modes.map((mode) => ({ mode, ...MODE_INFO[mode] })),
    caveats
  };
}

module.exports = { MODES, MODE_INFO, routeTask };
