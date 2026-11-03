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
    $labelsToCheck = if ($summaryDocument -eq 'README.md') { @('Objective:', 'Changed Files:', 'Validation Results:', 'Risks:', 'Required Acceptance Checks:', 'Conclusion:') } else { $summaryLabels }
    foreach ($label in $labelsToCheck) {
        Require-Text $document $label $summaryDocument
    }
}

$caseCount = [regex]::Matches($contracts, '(?m)^## Case \d+:').Count
if ($caseCount -lt 16) {
    Add-Failure ("Active V2 behavior contracts must define at least 16 cases; found " + $caseCount)
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
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Static skill checks passed: UTF-8, V2 authority, V1 baseline, stable identifier, links, summary templates, and active behavior contracts."
