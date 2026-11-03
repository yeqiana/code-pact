$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$required = @(
  "SKILL.md",
  "README.md",
  "references/renderer-contract.md",
  "examples/thread-pool.md",
  "examples/thread-pool.ui.json",
  "demo/index.html",
  "demo/renderer.js",
  "tests/renderer.test.mjs"
)
foreach ($name in $required) {
  $path = Join-Path $root $name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "缺少文件: $name"
  }
}
Write-Output "[PASS] 文件结构：$($required.Count) 个文件"

$skill = Get-Content -LiteralPath (Join-Path $root "SKILL.md") -Raw -Encoding UTF8
if (-not ($skill -match "(?s)^---\s+name: intelligent-ui\s+description: .+?\s+---")) {
  throw "SKILL.md front matter 格式错误"
}
Write-Output "[PASS] Skill front matter"

$json = Get-Content -LiteralPath (Join-Path $root "examples/thread-pool.ui.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if ($json.version -ne "intelligent-ui-demo/v1") { throw "协议版本错误" }
if ($json.controls.Count -lt 1 -or $json.controls.Count -gt 8) { throw "控件数量错误" }
if ($json.metrics.Count -gt 12) { throw "指标数量错误" }
$ids = @{}
foreach ($c in $json.controls) {
  if ($c.type -ne "slider" -or $ids.ContainsKey([string]$c.id)) { throw "滑块类型或 ID 错误" }
  if ($c.min -ge $c.max -or $c.step -le 0 -or $c.value -lt $c.min -or $c.value -gt $c.max) { throw "滑块数值错误" }
  $ids[[string]$c.id] = $true
}
foreach ($m in $json.metrics) {
  if (-not $ids.ContainsKey([string]$m.source)) { throw "指标引用不存在的控件" }
}
Write-Output "[PASS] 示例 JSON 基础协议校验"

$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) {
  Write-Warning "未安装 Node.js：JS 语法与交互单元测试未执行，需另行验收"
  exit 0
}
& node --check (Join-Path $root "demo/renderer.js")
if ($LASTEXITCODE -ne 0) { throw "JS 语法校验失败" }
Write-Output "[PASS] JS 语法"
& node --test (Join-Path $root "tests/renderer.test.mjs")
if ($LASTEXITCODE -ne 0) { throw "交互单元测试失败" }
Write-Output "[PASS] Node.js 单元测试"
