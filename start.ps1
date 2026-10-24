$ErrorActionPreference = 'Stop'
$runtimePath = (Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Source
$runtimeMajor = if ($runtimePath) { [int]((& $runtimePath --version).TrimStart('v').Split('.')[0]) } else { 0 }
if ($runtimeMajor -lt 24) {
    $bundledRuntime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if (!(Test-Path -LiteralPath $bundledRuntime)) { throw '需要 Node.js 24 或更新版本。' }
    $runtimePath = $bundledRuntime
}
Push-Location $PSScriptRoot
try { & $runtimePath --env-file-if-exists=.env server.mjs }
finally { Pop-Location }
