[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = [System.Text.UTF8Encoding]::new($false, $true)
$failures = [System.Collections.Generic.List[string]]::new()

function Add-Failure([string]$Message) {
    $script:failures.Add($Message)
}

function Read-Utf8([string]$RelativePath) {
    $path = Join-Path $root $RelativePath
    if (-not (Test-Path -LiteralPath $path)) {
        Add-Failure ("Missing file: " + $RelativePath)
        return ''
    }

    try {
        return [System.IO.File]::ReadAllText($path, $utf8)
    }
    catch {
        Add-Failure ("Invalid UTF-8: " + $RelativePath)
        return ''
    }
}

function Require-Text([string]$Text, [string]$Needle, [string]$Source) {
    if (-not $Text.Contains($Needle)) {
        Add-Failure ("Missing required text in " + $Source + ": " + $Needle)
    }
}

function Reject-Text([string]$Text, [string]$Needle, [string]$Source) {
    if ($Text.Contains($Needle)) {
        Add-Failure ("Forbidden legacy text in " + $Source + ": " + $Needle)
    }
}
function Convert-CodePointsToText([int[]]$CodePoints) {
    return -join ($CodePoints | ForEach-Object { [char]$_ })
}

function Test-LocalMarkdownLinks([string]$RelativePath, [string]$Text) {
    $matches = [regex]::Matches($Text, '\[[^\]]+\]\(([^)]+)\)')
    foreach ($match in $matches) {
        $target = $match.Groups[1].Value.Trim('<>')
        if ($target -match '[<>]') { continue }
        if ($target -match '^(https?:|mailto:|#)') {
            continue
        }

        $pathPart = $target.Split('#')[0]
        if ([string]::IsNullOrWhiteSpace($pathPart)) {
            continue
        }

        $baseDirectory = Split-Path -Parent (Join-Path $root $RelativePath)
        $resolved = Join-Path $baseDirectory $pathPart
        if ($resolved -match '[<>|?*]') { continue }
        if (-not (Test-Path -LiteralPath $resolved -ErrorAction SilentlyContinue)) {
            Add-Failure ("Broken local Markdown link in " + $RelativePath + ": " + $target)
        }
    }
}

$skill = Read-Utf8 'SKILL.md'
$spec = Read-Utf8 'references/code-pact-execution-spec-v2.md'
$v1Spec = Read-Utf8 'references/code-pact-execution-spec-v1.md'
$v1SpecSnapshot = Read-Utf8 'references/code-pact-execution-spec-v1-d660eaa.md'
$readme = Read-Utf8 'README.md'
$readmeZh = Read-Utf8 'README.zh-CN.md'
$contracts = Read-Utf8 'evals/behavior-contracts.md'
$manualEvaluation = Read-Utf8 'evals/manual-evaluation.md'
$toolSafety = Read-Utf8 'references/tool-safety-contract.md'
$reviewLifecycle = Read-Utf8 'references/review-lifecycle-contract.md'
$reviewSchema = Read-Utf8 'evals/schema/review.schema.json'
$reviewCli = Read-Utf8 'scripts/review-lifecycle.cjs'
$reviewReport = Read-Utf8 'scripts/lib/review-report.cjs'
$reviewLedgerTemplate = Read-Utf8 'templates/review-ledger.template.json'
$taskRoutingContract = Read-Utf8 'references/task-routing-contract.md'
$taskRouterLibrary = Read-Utf8 'scripts/lib/task-router.cjs'
$taskRouterCli = Read-Utf8 'scripts/task-router.cjs'
$v1Contracts = Read-Utf8 'evals/v1-behavior-contracts.md'
$v1Manual = Read-Utf8 'evals/v1-manual-evaluation.md'
$v1Baseline = Read-Utf8 'evals/v1-baseline-d660eaa.md'
$editorConfig = Read-Utf8 '.editorconfig'
$agentManifest = Read-Utf8 'agents/openai.yaml'
$workflow = Read-Utf8 '.github/workflows/validate.yml'
$codingPrompt = Read-Utf8 'prompts/coding.md'
$l1Example = Read-Utf8 'examples/l1-small-feature.md'
$l2Example = Read-Utf8 'examples/l2-module-task.md'

$summaryLabels = @(
    (Convert-CodePointsToText 0x3010, 0x76EE, 0x6807, 0x3011),
    (Convert-CodePointsToText 0x3010, 0x6539, 0x52A8, 0x6587, 0x4EF6, 0x3011),
    (Convert-CodePointsToText 0x3010, 0x81EA, 0x6D4B, 0x7ED3, 0x679C, 0x3011),
    (Convert-CodePointsToText 0x3010, 0x98CE, 0x9669, 0x3011),
    (Convert-CodePointsToText 0x3010, 0x5FC5, 0x987B, 0x9A8C, 0x6536, 0x3011),
    (Convert-CodePointsToText 0x3010, 0x7ED3, 0x8BBA, 0x3011)
)

Require-Text $skill 'name: code-pact' 'SKILL.md'
Require-Text $skill 'references/code-pact-execution-spec-v2.md' 'SKILL.md'
Require-Text $skill '## Context Contract' 'SKILL.md'
Require-Text $skill 'Scope Confirmation' 'SKILL.md'
Require-Text $skill 'Execution Approval' 'SKILL.md'
Require-Text $spec 'ACTIVE_NORMATIVE_SOURCE: references/code-pact-execution-spec-v2.md' 'references/code-pact-execution-spec-v2.md'
Require-Text $spec 'Minimal Sufficient Change' 'references/code-pact-execution-spec-v2.md'
Require-Text $spec '## 6.1 Context Contract' 'references/code-pact-execution-spec-v2.md'
Require-Text $spec 'Maintainer-quality Review' 'references/code-pact-execution-spec-v2.md'
Require-Text $spec '## 6.5 Tool Safety / Untrusted Inputs' 'references/code-pact-execution-spec-v2.md'
Require-Text $skill '## Tool Safety / Untrusted Inputs' 'SKILL.md'
Require-Text $toolSafety '## Trust boundaries' 'references/tool-safety-contract.md'
Require-Text $toolSafety '## Secrets and data scope' 'references/tool-safety-contract.md'
Require-Text $toolSafety '## Capability and approval' 'references/tool-safety-contract.md'
Require-Text $skill '## Task Mode Routing' 'SKILL.md'
Require-Text $skill 'references/task-routing-contract.md' 'SKILL.md'
Require-Text $spec '## 6.7 Task Mode Routing / Adaptive Context' 'references/code-pact-execution-spec-v2.md'
Require-Text $taskRoutingContract 'SUBORDINATE_REFERENCE:' 'references/task-routing-contract.md'
Require-Text $taskRoutingContract 'task_level: assess_from_repository' 'references/task-routing-contract.md'
Require-Text $skill '## Review Lifecycle' 'SKILL.md'
Require-Text $spec '## 6.6 Review Lifecycle' 'references/code-pact-execution-spec-v2.md'
Require-Text $reviewLifecycle 'explicit user decision can authorize' 'references/review-lifecycle-contract.md'
Require-Text $reviewLifecycle 'PASS_WITH_ACCEPTED_RISKS' 'references/review-lifecycle-contract.md'
Require-Text $reviewSchema 'Code Pact Review Lifecycle Ledger V1' 'evals/schema/review.schema.json'
Require-Text $reviewCli 'REVIEW_LEDGER_INVALID' 'scripts/review-lifecycle.cjs'
Require-Text $reviewCli 'renderReviewReport' 'scripts/review-lifecycle.cjs'
Require-Text $taskRouterLibrary 'routeTask' 'scripts/lib/task-router.cjs'
Require-Text $taskRouterCli 'TASK_ROUTER_FAILED' 'scripts/task-router.cjs'
Require-Text $readme '## Task modes and plan-driven workflows' 'README.md'
Require-Text $readmeZh 'scripts/task-router.cjs' 'README.zh-CN.md'
Require-Text $reviewReport 'renderReviewReport' 'scripts/lib/review-report.cjs'
Require-Text $reviewSchema 'validation_ids' 'evals/schema/review.schema.json'
Require-Text $reviewLedgerTemplate 'schema_version' 'templates/review-ledger.template.json'
Require-Text $readme 'Multi-round Review Lifecycle' 'README.md'
Require-Text $readmeZh 'Review Lifecycle' 'README.zh-CN.md'
Require-Text $v1Spec 'SUPERSEDED historical baseline' 'references/code-pact-execution-spec-v1.md'
Require-Text $readme '$code-pact' 'README.md'
Require-Text $readmeZh '$code-pact' 'README.zh-CN.md'
Require-Text $editorConfig 'charset = utf-8' '.editorconfig'
Require-Text $agentManifest '$code-pact' 'agents/openai.yaml'
Require-Text $workflow 'scripts/test-skill.ps1' '.github/workflows/validate.yml'
Require-Text $readme 'manual-evaluation.md' 'README.md'
Require-Text $readmeZh 'manual-evaluation.md' 'README.zh-CN.md'
Require-Text $manualEvaluation 'critical behavioral cases: 3/3 pass' 'evals/manual-evaluation.md'
Require-Text $manualEvaluation 'at least 2/3 pass' 'evals/manual-evaluation.md'
Require-Text $v1Baseline 'Baseline revision: d660eaa' 'evals/v1-baseline-d660eaa.md'
Require-Text $v1Baseline 'Stable skill identifier: $code-pact' 'evals/v1-baseline-d660eaa.md'
Require-Text $v1Contracts 'High-risk small diff is upgraded' 'evals/v1-behavior-contracts.md'
Require-Text $v1Manual 'all eight cases pass' 'evals/v1-manual-evaluation.md'

foreach ($summaryDocument in @(
    'SKILL.md',
    'README.md',
    'README.zh-CN.md',
    'references/code-pact-execution-spec-v2.md',
    'docs/examples.md',
    'examples/l0-micro-task.md',
    'examples/l1-small-feature.md',
    'examples/l2-module-task.md',
    'examples/review-example.md',
    'prompts/bugfix.md',
    'prompts/coding.md',
    'prompts/release.md',
    'prompts/review.md',
    'agents/openai.yaml'
)) {
    $document = Read-Utf8 $summaryDocument
    $labelsToCheck = if ($summaryDocument -in @('README.md', 'SKILL.md', 'agents/openai.yaml')) { @('Objective:', 'Changed Files:', 'Validation Results:', 'Risks:', 'Required Acceptance Checks:', 'Conclusion:') } else { $summaryLabels }
    foreach ($label in $labelsToCheck) {
        Require-Text $document $label $summaryDocument
    }
}

if ($readme -match '[\u4e00-\u9fff]') { Add-Failure 'English README contains Chinese text.' }
$caseCount = [regex]::Matches($contracts, '(?m)^## Case \d+:').Count
if ($caseCount -lt 33) {
    Add-Failure ("Active V2.2 behavior contracts must define at least 33 cases; found " + $caseCount)
}

foreach ($contractMarker in @(
    'L0 stays light',
    'L1 bounded impact',
    'L2 no mandatory state',
    'Scope versus execution approval',
    'Selective ambiguity',
    'Contract consumers',
    'Repository conformance gate',
    'Actionable review',
    'Minimal sufficient change',
    'Context budget',
    'Resume from checkpoint',
    'Detect workspace drift',
    'Parallel-safe delegation',
    'Shared-state stays serial',
    'Capability-based roles',
    'Harness feedback loop',
    'Untrusted tool output',
    'Secret-safe diagnostics',
    'External publication approval',
    'User-language summary',
'Multi-round review continuity',
'Requirement traceability and omission detection',
'Root-cause evidence chain',
'Risk acceptance requires user approval',
'Final verdict derived from evidence',
'Reopen finding without losing identity',
'Invalidate stale review evidence',
    'Single-entry project analysis stays read-only',
    'Plan-driven implementation then verification',
    'Task mode is independent from task level',
    'Release routing does not authorize publication',
    'Negated and ambiguous routing fails safely',
    'Selective context loading by task intent',
    'Execution Approval',
    'do not report merge-ready merely because tests pass'
)) {
    Require-Text $contracts $contractMarker 'evals/behavior-contracts.md'
}

foreach ($prompt in @('prompts/bugfix.md', 'prompts/coding.md', 'prompts/release.md', 'prompts/review.md')) {
    $document = Read-Utf8 $prompt
    Require-Text $document '$code-pact' $prompt
}

$markdownFiles = Get-ChildItem -Path $root -Recurse -File -Filter '*.md' | Where-Object {
    $_.FullName -notmatch '[\\/](\.git|\.idea|\.eval-runs|artifacts|xiaozhi-esp32-robot)[\\/]'
}
foreach ($file in $markdownFiles) {
    $relative = $file.FullName.Substring($root.Length).TrimStart([char[]]'\/')
    $document = Read-Utf8 $relative
    Test-LocalMarkdownLinks $relative $document
}

$evalFixtureScript = Join-Path $PSScriptRoot 'test-eval-fixtures.ps1'
& $evalFixtureScript
if (-not $?) {
    Add-Failure 'Evaluation fixture validation failed'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Add-Failure 'Node.js 20+ is required for negative evaluation tests'
} else {
    & node --test (Join-Path $PSScriptRoot 'tests/eval-contracts.test.cjs') (Join-Path $PSScriptRoot 'tests/review-lifecycle.test.cjs') (Join-Path $PSScriptRoot 'tests/task-router.test.cjs')
    if ($LASTEXITCODE -ne 0) { Add-Failure 'Evaluation negative tests failed' }
}
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Static skill checks passed: UTF-8, V2 authority, V1 baseline, stable identifier, links, summary templates, and active behavior contracts."