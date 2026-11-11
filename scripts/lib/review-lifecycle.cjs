'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { checkSchema, validate: validateAgainstSchema } = require('./eval-contracts.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT, 'evals', 'schema', 'review.schema.json');
const REVIEW_SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

const FINDING_STATUSES = new Set([
  'open', 'investigating', 'fixed_pending_verification', 'verified_closed',
  'accepted_risk', 'deferred', 'rejected_with_evidence', 'blocked'
]);
const REQUIREMENT_STATUSES = new Set(['not_assessed', 'satisfied', 'unsatisfied', 'blocked', 'deferred']);
const RESTRICTED_RISK_DOMAINS = new Set(['security', 'authorization', 'data_integrity']);
const FINDING_TRANSITIONS = new Map([
  [null, new Set(['open'])],
  ['open', new Set(['investigating', 'fixed_pending_verification', 'accepted_risk', 'deferred', 'rejected_with_evidence', 'blocked'])],
  ['investigating', new Set(['open', 'fixed_pending_verification', 'accepted_risk', 'deferred', 'rejected_with_evidence', 'blocked'])],
  ['fixed_pending_verification', new Set(['verified_closed', 'open', 'investigating', 'blocked'])],
  ['verified_closed', new Set(['open', 'investigating'])],
  ['accepted_risk', new Set(['open', 'investigating'])],
  ['deferred', new Set(['open', 'investigating'])],
  ['rejected_with_evidence', new Set(['open', 'investigating'])],
  ['blocked', new Set(['open', 'investigating', 'fixed_pending_verification'])]
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validTimestamp(value) {
  return hasText(value) &&
    Number.isFinite(Date.parse(value)) &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' &&
    relative !== '..' &&
    !relative.startsWith('..' + path.sep) &&
    !path.isAbsolute(relative);
}

function uniqueMap(items, field, label, errors) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!isObject(item) || !hasText(item[field])) continue;
    if (map.has(item[field])) errors.push('duplicate ' + label + ' ID: ' + item[field]);
    else map.set(item[field], item);
  }
  return map;
}

function findDecision(review, finding, expectedType) {
  if (!finding || !finding.decision_id) return null;
  return (review.decisions || []).find((decision) =>
    decision.id === finding.decision_id &&
    decision.target_type === 'finding' &&
    decision.target_id === finding.id &&
    decision.type === expectedType
  ) || null;
}

function findRequirementDecision(review, requirement, expectedType) {
  return (review.decisions || []).find((decision) =>
    decision.target_type === 'requirement' &&
    decision.target_id === requirement.id &&
    decision.type === expectedType
  ) || null;
}

function isUserApprovedDecision(decision, errors, label) {
  if (!decision) {
    errors.push(label + ' requires an explicit linked user decision');
    return false;
  }
  let valid = true;
  if (decision.approver_role !== 'user' || !hasText(decision.approved_by)) {
    errors.push(label + ' must be explicitly approved by the user');
    valid = false;
  }
  if (!validTimestamp(decision.approved_at)) {
    errors.push(label + ' has an invalid approval timestamp');
    valid = false;
  }
  if (!hasText(decision.rationale) || !hasText(decision.impact) ||
      !hasText(decision.likelihood) || !hasText(decision.residual_risk)) {
    errors.push(label + ' is missing rationale, impact, likelihood or residual risk');
    valid = false;
  }
  if (!Array.isArray(decision.mitigation) || decision.mitigation.length === 0 ||
      !decision.mitigation.every(hasText)) {
    errors.push(label + ' requires at least one concrete mitigation');
    valid = false;
  }
  if (decision.expires_at !== null) {
    if (!validTimestamp(decision.expires_at)) {
      errors.push(label + ' has an invalid expiry timestamp');
      valid = false;
    } else if (validTimestamp(decision.approved_at) && Date.parse(decision.expires_at) <= Date.parse(decision.approved_at)) {
      errors.push(label + ' expiry must be later than approval time');
      valid = false;
    }
  } else if (!hasText(decision.revisit_condition)) {
    errors.push(label + ' requires an expiry time or revisit condition');
    valid = false;
  }
  if (validTimestamp(decision.expires_at) && Date.parse(decision.expires_at) <= Date.now()) {
    errors.push(label + ' risk acceptance has expired; reassessment required');
    valid = false;
  }
  return valid;
}

function deriveVerdict(review) {
  const reasons = [];
  let failed = false;
  let blocked = false;
  let acceptedRisk = false;

  if (!(review.requirements || []).length) {
    blocked = true;
    reasons.push('no baseline requirements were recorded');
  }
  if (!(review.baseline?.scope || []).length) {
    blocked = true;
    reasons.push('review scope is empty');
  }
  if (!(review.validations || []).some((item) => item.required)) {
    blocked = true;
    reasons.push('no required validations were recorded');
  }

  for (const requirement of review.requirements || []) {
    if (requirement.status === 'unsatisfied') {
      failed = true;
      reasons.push(requirement.id + ' is unsatisfied');
    } else if (requirement.status === 'blocked' || requirement.status === 'not_assessed') {
      blocked = true;
      reasons.push(requirement.id + ' is not fully assessed');
    } else if (requirement.status === 'satisfied' && requirement.priority === 'must' && review.final) {
      const linkedIds = requirement.validation_ids || [];
      if (linkedIds.length === 0) {
        blocked = true;
        reasons.push(requirement.id + ' has no linked validation evidence');
      }
      for (const validationId of linkedIds) {
        const linked = (review.validations || []).find((entry) => entry.id === validationId);
        if (!linked || linked.status !== 'passed' || linked.revision !== review.final.reviewed_revision) {
          blocked = true;
          reasons.push(requirement.id + ' validation link ' + validationId + ' is missing, unpassed or stale');
        }
      }
    } else if (requirement.status === 'deferred') {
      if (requirement.priority === 'must') {
        failed = true;
        reasons.push(requirement.id + ' mandatory requirement cannot be deferred');
        continue;
      }
      const decision = findRequirementDecision(review, requirement, 'defer');
      if (decision && decision.approver_role === 'user' &&
          (hasText(decision.revisit_condition) || validTimestamp(decision.expires_at))) {
        acceptedRisk = true;
        reasons.push(requirement.id + ' is deferred by user decision');
      } else {
        blocked = true;
        reasons.push(requirement.id + ' has no valid user-approved deferral');
      }
    }
  }

  for (const finding of review.findings || []) {
    if (finding.status === 'open' || finding.status === 'investigating' ||
        finding.status === 'fixed_pending_verification') {
      if (finding.classification === 'confirmed_defect') {
        failed = true;
        reasons.push(finding.id + ' is an unresolved confirmed defect');
      } else {
        blocked = true;
        reasons.push(finding.id + ' remains unresolved or unverified');
      }
    } else if (finding.status === 'blocked') {
      blocked = true;
      reasons.push(finding.id + ' is blocked');
    } else if (finding.status === 'accepted_risk' || finding.status === 'deferred') {
      acceptedRisk = true;
      reasons.push(finding.id + ' remains as an accepted risk/deferral');
    }
  }

  for (const validation of review.validations || []) {
    if (!validation.required) continue;
    if (validation.status === 'failed') {
      failed = true;
      reasons.push(validation.id + ' required validation failed');
    } else if (validation.status === 'not_run' || validation.status === 'blocked') {
      blocked = true;
      reasons.push(validation.id + ' required validation was not completed');
    } else if (validation.status === 'passed' && review.final && validation.revision !== review.final.reviewed_revision) {
      blocked = true;
      reasons.push(validation.id + ' passed on a different revision');
    }
  }

  return {
    verdict: failed ? 'FAIL' : blocked ? 'BLOCKED' :
      acceptedRisk ? 'PASS_WITH_ACCEPTED_RISKS' : 'PASS',
    reasons
  };
}

function validateReview(review, options = {}) {
  const errors = [];
  try {
    checkSchema(REVIEW_SCHEMA, 'review.schema');
    errors.push(...validateAgainstSchema(review, REVIEW_SCHEMA, 'review', []));
  } catch (error) {
    errors.push('review schema error: ' + error.message);
    return { valid: false, errors, verdict: null, reasons: [] };
  }

  if (!isObject(review)) {
    return { valid: false, errors, verdict: null, reasons: [] };
  }

  if (review.schema_version !== 1) errors.push('unsupported schema_version; expected 1');
  if (!validTimestamp(review.created_at)) errors.push('created_at must be an ISO-8601 timestamp with timezone');
  if (!validTimestamp(review.updated_at)) errors.push('updated_at must be an ISO-8601 timestamp with timezone');
  if (validTimestamp(review.created_at) && validTimestamp(review.updated_at) && Date.parse(review.updated_at) < Date.parse(review.created_at)) {
    errors.push('updated_at cannot be earlier than created_at');
  }
  if (!review.baseline || !/^[a-fA-F0-9]{64}$/.test(review.baseline.requirements_source?.sha256 || '')) {
    errors.push('baseline.requirements_source.sha256 must be a SHA-256 hex digest');
  }
  if (review.baseline?.git_head !== null &&
      review.baseline?.git_head !== undefined &&
      !/^[a-fA-F0-9]{40}$/.test(review.baseline.git_head)) {
    errors.push('baseline.git_head must be a 40-character Git commit SHA or null');
  }

  const requirements = Array.isArray(review.requirements) ? review.requirements : [];
  const findings = Array.isArray(review.findings) ? review.findings : [];
  const decisions = Array.isArray(review.decisions) ? review.decisions : [];
  const rounds = Array.isArray(review.rounds) ? review.rounds : [];
  const validations = Array.isArray(review.validations) ? review.validations : [];

  const requirementMap = uniqueMap(requirements, 'id', 'requirement', errors);
  const findingMap = uniqueMap(findings, 'id', 'finding', errors);
  const decisionMap = uniqueMap(decisions, 'id', 'decision', errors);
  const validationMap = uniqueMap(validations, 'id', 'validation', errors);
  const roundMap = uniqueMap(rounds, 'id', 'round', errors);

  for (const requirement of requirements) {
    if (requirement.supersedes && !requirementMap.has(requirement.supersedes)) {
      errors.push(requirement.id + ' supersedes an unknown requirement ' + requirement.supersedes);
    }
    if (requirement.supersedes === requirement.id) errors.push(requirement.id + ' cannot supersede itself');
    if (requirement.status === 'satisfied' &&
        (!Array.isArray(requirement.evidence) || requirement.evidence.length === 0)) {
      errors.push(requirement.id + ' is marked satisfied without evidence');
    }
  }

  // Requirement state is reconstructed from round events, not trusted from the latest summary field.
  const requirementStates = new Map(requirements.map((item) => [item.id, 'not_assessed']));
  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index];
    const expectedId = 'R' + String(index + 1).padStart(2, '0');
    if (round.id !== expectedId) errors.push('review rounds must be continuous; expected ' + expectedId);
    if (index === 0 && round.kind !== 'initial') errors.push('R01 must be the initial review round');
    if (round.kind === 'final' && index !== rounds.length - 1) errors.push('final round must be the last round');
    if (!validTimestamp(round.started_at)) errors.push(round.id + ' started_at must include a timezone');
    if (round.status === 'completed' && !validTimestamp(round.completed_at)) {
      errors.push(round.id + ' completed round requires completed_at with timezone');
    }
    if (round.status === 'completed' && validTimestamp(round.started_at) && validTimestamp(round.completed_at) && Date.parse(round.completed_at) < Date.parse(round.started_at)) {
      errors.push(round.id + ' completed_at cannot be earlier than started_at');
    }
    if (round.status === 'in_progress' && round.completed_at !== null) {
      errors.push(round.id + ' in_progress round must have completed_at=null');
    }

    for (const requirementId of round.requirements_reviewed || []) {
      if (!requirementMap.has(requirementId)) errors.push(round.id + ' references unknown ' + requirementId);
    }
    for (const update of round.requirement_updates || []) {
      const requirement = requirementMap.get(update.requirement_id);
      if (!requirement) {
        errors.push(round.id + ' updates unknown requirement ' + update.requirement_id);
        continue;
      }
      const current = requirementStates.get(update.requirement_id);
      if (update.from_status !== current) {
        errors.push(round.id + ' ' + update.requirement_id + ' state transition expected from ' + current);
      }
      if (update.to_status === current) errors.push(round.id + ' contains a no-op requirement transition for ' + update.requirement_id);
      if (update.to_status === 'satisfied' &&
          (!Array.isArray(update.evidence) || update.evidence.length === 0)) {
        errors.push(round.id + ' marks ' + update.requirement_id + ' satisfied without evidence');
      }
      if (typeof update.to_status === 'string' && REQUIREMENT_STATUSES.has(update.to_status)) {
        requirementStates.set(update.requirement_id, update.to_status);
      }
      if (!hasText(update.reason)) errors.push(round.id + ' requirement update requires a reason');
    }
  }

  for (const requirement of requirements) {
    const linked = requirement.validation_ids || [];
    for (const id of linked) if (!validationMap.has(id)) errors.push(requirement.id + ' references unknown validation ' + id);
    if (new Set(linked).size !== linked.length) errors.push(requirement.id + ' contains duplicate validation IDs');
    if (requirementStates.get(requirement.id) !== requirement.status) {
      errors.push(requirement.id + ' current status does not match its round history');
    }
  }

  // Finding state is reconstructed from events so a later regression must explicitly reopen the same ID.
  const findingStates = new Map();
  const firstFindingRound = new Map();
  const verificationRound = new Map();
  for (const round of rounds) {
    for (const event of round.finding_events || []) {
      const finding = findingMap.get(event.finding_id);
      if (!finding) {
        errors.push(round.id + ' updates unknown finding ' + event.finding_id);
        continue;
      }
      const current = findingStates.has(event.finding_id) ? findingStates.get(event.finding_id) : null;
      if (event.from_status !== current) {
        errors.push(round.id + ' ' + event.finding_id + ' state transition expected from ' + String(current));
      }
      if (event.to_status === current) errors.push(round.id + ' contains a no-op finding transition for ' + event.finding_id);
      if (!FINDING_TRANSITIONS.get(current)?.has(event.to_status)) {
        errors.push(round.id + ' illegal finding transition ' + String(current) + ' -> ' + event.to_status + ' for ' + event.finding_id);
      }
      if (!hasText(event.reason)) errors.push(round.id + ' finding transition requires a reason');
      if (!Array.isArray(event.evidence) || event.evidence.length === 0) {
        errors.push(round.id + ' finding transition requires evidence');
      }
      if (current === null) firstFindingRound.set(event.finding_id, round.id);
      if (event.to_status === 'verified_closed') verificationRound.set(event.finding_id, round.reviewed_revision);
      if (FINDING_STATUSES.has(event.to_status)) findingStates.set(event.finding_id, event.to_status);
    }
  }

  for (const finding of findings) {
    if (!roundMap.has(finding.discovered_round)) errors.push(finding.id + ' references unknown discovered_round');
    if (firstFindingRound.get(finding.id) !== finding.discovered_round) {
      errors.push(finding.id + ' first event must be recorded in discovered_round');
    }
    if (findingStates.get(finding.id) !== finding.status) {
      errors.push(finding.id + ' current status does not match its round history');
    }
    for (const requirementId of finding.linked_requirements || []) {
      if (!requirementMap.has(requirementId)) errors.push(finding.id + ' links unknown requirement ' + requirementId);
    }

    const root = finding.root_cause || {};
    if (root.status === 'confirmed' && (!hasText(root.statement) || !(root.evidence || []).length)) {
      errors.push(finding.id + ' confirmed root cause requires a statement and supporting evidence');
    }
    if ((root.status === 'hypothesis' || root.status === 'likely') &&
        (!hasText(root.statement) || !(root.evidence || []).length)) {
      errors.push(finding.id + ' hypothesis/likely root cause requires supporting evidence');
    }
    if (root.status === 'not_applicable' && !(root.counter_evidence || []).length) {
      errors.push(finding.id + ' not_applicable root cause requires counter-evidence');
    }

    if (finding.status === 'verified_closed') {
      if (!['confirmed', 'not_applicable'].includes(root.status)) {
        errors.push(finding.id + ' cannot close before root cause is confirmed or proven not applicable');
      }
      if (!hasText(finding.resolution?.summary) || !(finding.resolution?.evidence || []).length) {
        errors.push(finding.id + ' verified_closed requires resolution evidence');
      }
      if (!hasText(finding.resolution?.verified_at_revision)) {
        errors.push(finding.id + ' verified_closed requires verified_at_revision');
      } else if (verificationRound.get(finding.id) !== finding.resolution.verified_at_revision) {
        errors.push(finding.id + ' verified_at_revision does not match the closing round revision');
      }
    }

    if (finding.status === 'rejected_with_evidence') {
      if (finding.classification !== 'excluded') errors.push(finding.id + ' rejected_with_evidence must use classification=excluded');
      if (!(root.counter_evidence || []).length) errors.push(finding.id + ' rejected finding requires counter-evidence');
    }
    if (finding.classification === 'excluded' && finding.status !== 'rejected_with_evidence') {
      errors.push(finding.id + ' classification=excluded requires rejected_with_evidence status');
    }

    if (finding.status === 'accepted_risk' || finding.status === 'deferred') {
      const expectedType = finding.status === 'accepted_risk' ? 'accept_risk' : 'defer';
      const decision = findDecision(review, finding, expectedType);
      if (finding.decision_id && !decisionMap.has(finding.decision_id)) {
        errors.push(finding.id + ' references unknown decision ' + finding.decision_id);
      }
      const approved = isUserApprovedDecision(decision, errors, finding.id + ' ' + finding.status);
      if (approved && (finding.severity === 'critical' || finding.severity === 'high' ||
          RESTRICTED_RISK_DOMAINS.has(finding.risk_domain))) {
        errors.push(finding.id + ' is not eligible for the standard risk acceptance/deferral path');
      }
    }
  }

  for (const decision of decisions) {
    if (decision.target_type === 'finding' && !findingMap.has(decision.target_id)) {
      errors.push(decision.id + ' targets unknown finding ' + decision.target_id);
    }
    if (decision.target_type === 'requirement' && !requirementMap.has(decision.target_id)) {
      errors.push(decision.id + ' targets unknown requirement ' + decision.target_id);
    }
    if (decision.type === 'accept_risk' && decision.target_type !== 'finding') {
      errors.push(decision.id + ' accept_risk must target a finding');
    }
    if (decision.type === 'reject_finding' && decision.target_type !== 'finding') {
      errors.push(decision.id + ' reject_finding must target a finding');
    }
    if ((decision.type === 'accept_risk' || decision.type === 'defer') &&
        decision.approver_role !== 'user') {
      errors.push(decision.id + ' requires approver_role=user');
    }
  }

  for (const requirement of requirements) {
    if (requirement.status === 'deferred') {
      if (requirement.priority === 'must') errors.push(requirement.id + ' mandatory requirement cannot be deferred');
      const decision = findRequirementDecision(review, requirement, 'defer');
      isUserApprovedDecision(decision, errors, requirement.id + ' deferral');
    }
  }

  for (const validation of validations) {
    if (!validTimestamp(validation.executed_at)) errors.push(validation.id + ' executed_at must include a timezone');
    if (review.final && validation.required && validation.status === 'passed' && validation.revision !== review.final.reviewed_revision) {
      errors.push(validation.id + ' required validation uses a stale revision');
    }
    if (validation.status === 'passed') {
      if (!Array.isArray(validation.evidence) || validation.evidence.length === 0) {
        errors.push(validation.id + ' passed validation requires evidence');
      }
      if (validation.exit_code !== null && validation.exit_code !== 0) {
        errors.push(validation.id + ' passed validation must have exit_code=0 or null for manual checks');
      }
    }
    if (validation.status === 'failed' && (!Array.isArray(validation.evidence) || validation.evidence.length === 0)) {
      errors.push(validation.id + ' failed validation must retain failure evidence');
    }
  }

  let verdict = null;
  let reasons = [];
  if (review.status === 'active' && review.final !== null) errors.push('active review must not contain a final record');
  if (review.status === 'completed' && review.final === null) errors.push('completed review requires a final record');

  if (review.final !== null && review.final !== undefined) {
    if (requirements.length === 0) errors.push('finalization requires at least one baseline requirement');
    if (!validations.some((entry) => entry.required)) errors.push('finalization requires at least one required validation');
    if (!(review.baseline?.scope || []).length) errors.push('finalization requires a non-empty review scope');
    if (rounds.length < 3) errors.push('finalized multi-round review requires initial, challenge and final rounds');
    if (rounds[0]?.kind !== 'initial') errors.push('finalized review must begin with an initial round');
    if (!rounds.some((round) => round.kind === 'challenge')) errors.push('finalized review requires an independent challenge round');
    if (rounds[rounds.length - 1]?.kind !== 'final') errors.push('final review must be the last round');
    if (rounds.some((round) => round.status !== 'completed')) errors.push('all rounds must be completed before finalization');

    const latest = rounds[rounds.length - 1];
    if (latest && review.final.reviewed_revision !== latest.reviewed_revision) {
      errors.push('final reviewed_revision must match the latest round revision');
    }
    if (!validTimestamp(review.final.generated_at)) errors.push('final.generated_at must include a timezone');

    const allRequirementIds = requirements.map((item) => item.id);
    for (const kind of ['challenge', 'final']) {
      const round = rounds.find((item) => item.kind === kind) || (kind === 'final' ? latest : null);
      if (round) {
        for (const id of allRequirementIds) {
          if (!(round.requirements_reviewed || []).includes(id)) {
            errors.push(round.id + ' must review baseline requirement ' + id);
          }
        }
      }
    }

    const derived = deriveVerdict(review);
    verdict = derived.verdict;
    reasons = derived.reasons;
    if (review.final.verdict !== verdict) {
      errors.push('final verdict mismatch: ledger state derives ' + verdict + ', but final declares ' + review.final.verdict);
    }
    if (review.final.user_acceptance === 'accepted' && !['PASS', 'PASS_WITH_ACCEPTED_RISKS'].includes(verdict)) {
      errors.push('a FAIL/BLOCKED review cannot be marked user_acceptance=accepted');
    }
  } else {
    verdict = 'IN_PROGRESS';
  }

  if (options.currentRevision && review.final &&
      options.currentRevision !== review.final.reviewed_revision) {
    errors.push('workspace revision drift: current revision differs from final reviewed_revision');
  }

  return { valid: errors.length === 0, errors, verdict, reasons };
}

module.exports = {
  ROOT,
  REVIEW_SCHEMA,
  validateReview,
  deriveVerdict,
  isInside,
  validTimestamp
};
