[CmdletBinding()]
param(
    [string]$ResultsDirectory = 'evals/results/2026-10-01-claude-deepseek-v4-flash',
    [switch]$WriteSummary,
    [switch]$VerifySummary
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required for result verification.' }
$argsToNode = @((Join-Path $PSScriptRoot 'eval-cli.cjs'), 'summarize', $ResultsDirectory)
if ($WriteSummary) { $argsToNode += '--write-summary' }
if ($VerifySummary) { $argsToNode += '--verify-summary' }
& node @argsToNode
if ($LASTEXITCODE -ne 0) { throw 'Evaluation result verification failed.' }
