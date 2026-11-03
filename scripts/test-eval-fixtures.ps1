[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$casePath = Join-Path $root 'evals/cases/v2-cases.json'
$caseSchemaPath = Join-Path $root 'evals/schema/case.schema.json'
$resultSchemaPath = Join-Path $root 'evals/schema/result.schema.json'
$contractsPath = Join-Path $root 'evals/behavior-contracts.md'

foreach ($path in @($casePath, $caseSchemaPath, $resultSchemaPath, $contractsPath)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing evaluation artifact: $path"
    }
}

$cases = Get-Content -LiteralPath $casePath -Raw -Encoding UTF8 | ConvertFrom-Json
$null = Get-Content -LiteralPath $caseSchemaPath -Raw -Encoding UTF8 | ConvertFrom-Json
$null = Get-Content -LiteralPath $resultSchemaPath -Raw -Encoding UTF8 | ConvertFrom-Json
$contracts = Get-Content -LiteralPath $contractsPath -Raw -Encoding UTF8

if (@($cases).Count -lt 16) {
    throw "Expected at least 16 V2 cases; found $(@($cases).Count)"
}

$ids = @{}
foreach ($case in @($cases)) {
    foreach ($field in @('id','revision','title','class','task','expected_behaviors','forbidden_behaviors','required_evidence','max_ceremony')) {
        if ($null -eq $case.$field) {
            throw "Case $($case.id) missing required field $field"
        }
    }

    if ($ids.ContainsKey($case.id)) {
        throw "Duplicate case id: $($case.id)"
    }
    $ids[$case.id] = $true

    if ($case.class -notin @('deterministic','behavioral','critical_behavioral')) {
        throw "Invalid case class for $($case.id): $($case.class)"
    }

    if (@($case.expected_behaviors).Count -lt 1 -or @($case.required_evidence).Count -lt 1) {
        throw "Case $($case.id) needs expected behaviors and required evidence"
    }

    if (-not $contracts.Contains($case.title)) {
        throw "Markdown behavior contract missing structured case title: $($case.title)"
    }
}

Write-Host "Evaluation fixtures passed: $(@($cases).Count) unique V2 cases, schemas parse, and Markdown contracts match."