<#
.SYNOPSIS
  ローカルの .env を読み取り、EAS Secrets にプロジェクトスコープで一括登録する。

.DESCRIPTION
  eas.json の env ブロックで参照している EXPO_PUBLIC_FIREBASE_* 6 変数を対象に、
  EAS Secrets (project scope) を一括登録/更新する。
  事前に `npx eas-cli login` が完了している必要がある。

.PARAMETER EnvPath
  読み込む .env のパス（デフォルト: .env）

.PARAMETER Force
  既存 Secret を強制上書きする（eas secret:create --force）

.EXAMPLE
  .\scripts\register-eas-secrets.ps1

.EXAMPLE
  .\scripts\register-eas-secrets.ps1 -EnvPath .env.production -Force
#>
[CmdletBinding()]
param(
    [string]$EnvPath = '.env',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$RequiredKeys = @(
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
)

if (-not (Test-Path $EnvPath)) {
    Write-Host "[ERROR] $EnvPath が見つかりません。" -ForegroundColor Red
    Write-Host "  .env.example を参考に .env を作成してから再実行してください。" -ForegroundColor Yellow
    exit 1
}

Write-Host "==> .env を読み込み中: $EnvPath" -ForegroundColor Cyan
$envMap = @{}
Get-Content $EnvPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $idx = $line.IndexOf('=')
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
        if ($key) { $envMap[$key] = $value }
    }
}

$created = 0
$skipped = 0
$failed = 0
$missing = @()

foreach ($key in $RequiredKeys) {
    if (-not $envMap.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envMap[$key])) {
        Write-Host "[SKIP] $key : .env に未設定または空" -ForegroundColor Yellow
        $missing += $key
        $skipped++
        continue
    }
    $value = $envMap[$key]

    $args = @('secret:create', '--scope', 'project', '--name', $key, '--value', $value, '--non-interactive')
    if ($Force) { $args += '--force' }

    Write-Host "[CREATE] $key$(if ($Force) { ' (force)' } else { '' })" -ForegroundColor Green
    $output = & npx --yes eas-cli@latest @args 2>&1
    if ($LASTEXITCODE -eq 0) {
        $created++
    } else {
        $outStr = ($output | Out-String).Trim()
        if ($outStr -match 'already exists' -or $outStr -match 'EAS_SECRET_ALREADY_EXISTS') {
            Write-Host "  [SKIP] 既存。-Force で上書き可" -ForegroundColor DarkGray
            $skipped++
        } else {
            Write-Host "[ERROR] $key 登録失敗:" -ForegroundColor Red
            Write-Host $outStr -ForegroundColor Red
            $failed++
        }
    }
}

Write-Host ''
Write-Host '======== 結果 ========' -ForegroundColor Cyan
Write-Host "  作成/更新: $created"
Write-Host "  スキップ : $skipped"
Write-Host "  失敗     : $failed"
if ($missing.Count -gt 0) {
    Write-Host ''
    Write-Host "[WARN] 以下の必須変数が .env に未設定です:" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    exit 2
}
if ($failed -gt 0) {
    Write-Host '[ERROR] 一部失敗しました。ログを確認してください。' -ForegroundColor Red
    exit 3
}

Write-Host ''
Write-Host '完了。' -ForegroundColor Green
Write-Host '次: npx eas-cli build --profile preview --platform ios' -ForegroundColor Cyan
Write-Host '    npx eas-cli build --profile preview --platform android' -ForegroundColor Cyan
