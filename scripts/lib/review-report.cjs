'use strict';

// This module only renders already recorded facts; it does not invent or verify evidence.
function cell(value) {
  if (value === null || value === undefined) return '—';
  const text = String(value).replace(/[\r\n]+/g, ' ').trim()
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return text || '—';
}

function textList(values) {
  return Array.isArray(values) && values.length ? values.map(cell).join('、') : '—';
}

function section(title, lines) {
  return ['## ' + title, '', ...lines, ''];
}

function renderReviewReport(review, result) {
  if (!result || !result.valid) throw new Error('Cannot generate a report from an invalid review ledger');
  const requirements = review.requirements || [];
  const findings = review.findings || [];
  const decisions = review.decisions || [];
  const rounds = review.rounds || [];
  const validations = review.validations || [];
  const revision = review.final?.reviewed_revision || rounds.at(-1)?.reviewed_revision || null;
  const validationById = new Map(validations.map((entry) => [entry.id, entry]));
  const lines = [
    '# Code Pact 评审验收报告',
    '',
    '> 基于结构化台账生成。状态与测试记录为台账中的声明，不代表已独立验证证据真实性。',
    '',
    '- 评审会话：' + cell(review.review_id),
    '- 标题：' + cell(review.title),
    '- 台账状态：' + cell(review.status),
    '- **门禁结论：' + cell(result.verdict) + '**',
    '- 审核版本：' + cell(revision),
    '- 原始方案：' + cell(review.baseline?.requirements_source?.path),
    '- 原始 SHA-256：' + cell(review.baseline?.requirements_source?.sha256),
    '- 范围：' + textList(review.baseline?.scope),
    '- 轮次：' + rounds.length + '；需求：' + requirements.length + '；问题：' + findings.length + '；验证：' + validations.length,
    ''
  ];

  lines.push(...section('需求与验证追溯矩阵', [
    '| ID | 优先级 | 原始需求 | 状态 | 实现/设计引用 | 关联验证 | 验收证据 |',
    '|---|---|---|---|---|---|---|',
    ...requirements.map((requirement) => {
      const validationLinks = (requirement.validation_ids || []).map((id) => {
        const validation = validationById.get(id);
        return cell(id + (validation ? '(' + validation.status + ')' : '(missing)'));
      });
      return '| ' + [
        cell(requirement.id), cell(requirement.priority), cell(requirement.statement),
        cell(requirement.status), textList(requirement.implementation_refs),
        validationLinks.join('、') || '—', textList(requirement.evidence)
      ].join(' | ') + ' |';
    }),
    ...(requirements.length ? [] : ['| — | — | 无原始需求 | — | — | — | — |'])
  ]));

  lines.push(...section('问题台账与根因', [
    '| ID | 分类 | 严重性 | 问题 | 状态 | 根因状态 | 根因证据 | 关联需求 | 决策 |',
    '|---|---|---|---|---|---|---|---|---|',
    ...findings.map((finding) => '| ' + [
      cell(finding.id), cell(finding.classification), cell(finding.severity),
      cell(finding.title), cell(finding.status), cell(finding.root_cause?.status),
      textList(finding.root_cause?.evidence), textList(finding.linked_requirements),
      cell(finding.decision_id)
    ].join(' | ') + ' |'),
    ...(findings.length ? [] : ['| — | — | — | 未记录问题 | — | — | — | — | — |'])
  ]));

  lines.push(...section('验证执行记录', [
    '| ID | 必需 | 类型 | 状态 | 版本 | 退出码 | 命令/步骤 | 证据 |',
    '|---|---|---|---|---|---|---|---|',
    ...validations.map((validation) => '| ' + [
      cell(validation.id), validation.required ? '是' : '否',
      cell(validation.kind), cell(validation.status), cell(validation.revision),
      cell(validation.exit_code), cell(validation.command), textList(validation.evidence)
    ].join(' | ') + ' |'),
    ...(validations.length ? [] : ['| — | — | — | 无验证记录 | — | — | — | — |'])
  ]));

  lines.push(...section('轮次变化', [
    '| 轮次 | 类型 | 状态 | 版本 | 复核需求 | 需求变更 | 问题事件 | 摘要 |',
    '|---|---|---|---|---|---|---|---|',
    ...rounds.map((round) => '| ' + [
      cell(round.id), cell(round.kind), cell(round.status), cell(round.reviewed_revision),
      textList(round.requirements_reviewed),
      (round.requirement_updates || []).map((event) => cell(event.requirement_id + ':' + event.from_status + '→' + event.to_status)).join('、') || '—',
      (round.finding_events || []).map((event) => cell(event.finding_id + ':' + event.from_status + '→' + event.to_status)).join('、') || '—',
      cell(round.summary)
    ].join(' | ') + ' |')
  ]));

  lines.push(...section('风险接受与延期决策', [
    '| 决策 | 类型 | 对象 | 批准角色 | 批准人 | 接受理由 | 剩余风险 | 缓解措施 | 复查条件 |',
    '|---|---|---|---|---|---|---|---|---|',
    ...decisions.map((decision) => '| ' + [
      cell(decision.id), cell(decision.type), cell(decision.target_id),
      cell(decision.approver_role), cell(decision.approved_by), cell(decision.rationale),
      cell(decision.residual_risk), textList(decision.mitigation),
      cell(decision.revisit_condition || decision.expires_at)
    ].join(' | ') + ' |'),
    ...(decisions.length ? [] : ['| — | — | — | — | — | 无接受或延期决策 | — | — | — |'])
  ]));

  lines.push(...section('最终门禁依据与限制', [
    ...(result.reasons.length ? result.reasons.map((reason) => '- ' + cell(reason)) : ['- 台账内未发现阻断项。仍需人工核查原始需求覆盖范围与证据的实际有效性。']),
    '',
    '- 未链接验证的需求可从追溯矩阵中发现；必需需求缺乏有效验证时不得判定 PASS。',
    '- 依赖审批、日志、测试和人工观察的真实性必须由实际授权人或独立评审确认。',
    '- 项目存在未提交修改时，单独的 Git HEAD 不能保证代码/方案版本未漂移。',
    '- 本工具不会自行检测未记入台账的遗漏需求、漏洞或环境差异。'
  ]));

  if (review.final) {
    lines.push('原台账最终说明：' + cell(review.final.summary));
    lines.push('用户对最终交付的接受状态：' + cell(review.final.user_acceptance));
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

module.exports = { renderReviewReport };
