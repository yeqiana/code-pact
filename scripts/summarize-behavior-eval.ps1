[CmdletBinding()]
param(
    [string]$ResultsDirectory = 'evals/results/2026-10-01-claude-deepseek-v4-flash',
    [switch]$WriteSummary
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$casePath = Join-Path $root 'evals/cases/v2-cases.json'
$resultRoot = Join-Path $root $ResultsDirectory

if (-not (Test-Path -LiteralPath $casePath)) { throw "Missing case set: $casePath" }
if (-not (Test-Path -LiteralPath $resultRoot)) { throw "Missing results directory: $resultRoot" }

$cases = Get-Content -LiteralPath $casePath -Raw -Encoding UTF8 | ConvertFrom-Json
$runFiles = @(Get-ChildItem -LiteralPath $resultRoot -File -Filter 'V2-C*-run*.json')
$runs = @()
foreach ($file in $runFiles) {
    $obj = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $runs += [pscustomobject]@{
        file = $file.Name
        case_id = [string]$obj.case_id
        result = [string]$obj.result
        pass_count = [int]$obj.pass_count
        run_count = [int]$obj.run_count
        model = [string]$obj.model
        runtime = [string]$obj.agent_runtime_version
        fixture = [string]$obj.repo_fixture_revision
        skill = [string]$obj.skill_revision
    }
}

$summary = foreach ($case in $cases) {
    $caseRuns = @($runs | Where-Object { $_.case_id -eq $case.id })
    $totalRuns = $caseRuns.Count
    $passes = @($caseRuns | Where-Object { $_.result -eq 'pass' }).Count
    $thresholdRuns = 3
    $thresholdPasses = if ($case.class -eq 'critical_behavioral') { 3 } elseif ($case.class -eq 'behavioral') { 2 } else { 3 }

    $status = if ($totalRuns -ge $thresholdRuns -and $passes -ge $thresholdPasses) {
        'accepted'
    } elseif ($totalRuns -eq 0) {
        'not_run'
    } elseif ($totalRuns -ge $thresholdRuns) {
        'failed'
    } else {
        'in_progress'
    }

    [pscustomobject]@{
        case_id = $case.id
        title = $case.title
        class = $case.class
        runs = $totalRuns
        passes = $passes
        threshold = "$thresholdPasses/$thresholdRuns"
        status = $status
    }
}

$accepted = @($summary | Where-Object status -eq 'accepted').Count
$failed = @($summary | Where-Object status -eq 'failed').Count
$inProgress = @($summary | Where-Object status -eq 'in_progress').Count
$notRun = @($summary | Where-Object status -eq 'not_run').Count

$summary | Format-Table -AutoSize
Write-Host "Accepted=$accepted Failed=$failed InProgress=$inProgress NotRun=$notRun Total=$($summary.Count)"

if ($WriteSummary) {
    $payload = [ordered]@{
        generated_at = (Get-Date).ToString('o')
        results_directory = $ResultsDirectory
        accepted = $accepted
        failed = $failed
        in_progress = $inProgress
        not_run = $notRun
        total = $summary.Count
        cases = @($summary)
    }
    $json = $payload | ConvertTo-Json -Depth 8
    [IO.File]::WriteAllText((Join-Path $resultRoot 'summary.json'), $json, [Text.UTF8Encoding]::new($false))
}