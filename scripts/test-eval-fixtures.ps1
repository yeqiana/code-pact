[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required for schema validation.' }
& node (Join-Path $PSScriptRoot 'eval-cli.cjs') fixtures
if ($LASTEXITCODE -ne 0) { throw 'Evaluation fixture schema validation failed.' }
