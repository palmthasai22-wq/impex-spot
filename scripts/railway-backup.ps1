$ErrorActionPreference = 'Stop'
$cctvVars = railway variable list --service impex-spot-api --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot read Railway service configuration' }
$cctvBase = 'https://impex-spot-api-production.up.railway.app'
$cctvLoginBody = @{ username = $cctvVars.ADMIN_USERNAME; password = $cctvVars.ADMIN_PASSWORD } | ConvertTo-Json -Compress
$cctvLogin = Invoke-RestMethod -Uri "$cctvBase/api/admin/login" -Method Post -ContentType 'application/json' -Body $cctvLoginBody
if (-not $cctvLogin.token) { throw 'Existing admin login failed' }
Write-Output "Database admin account: $($cctvLogin.user.id -ne 'env-admin')"
$cctvFolder = Join-Path $PSScriptRoot '../.local/cctv-backup'
New-Item -Path $cctvFolder -ItemType Directory -Force | Out-Null
foreach ($cctvItem in @('pins', 'responders')) {
  $cctvRecords = Invoke-RestMethod -Uri "$cctvBase/api/admin/$cctvItem" -Headers @{ Authorization = "Bearer $($cctvLogin.token)" }
  if ($cctvRecords -isnot [array]) { throw "Unexpected $cctvItem response shape" }
  ConvertTo-Json -InputObject $cctvRecords -Depth 100 | Set-Content -LiteralPath (Join-Path $cctvFolder "$cctvItem.json") -Encoding utf8
  Write-Output "${cctvItem}: backed up $($cctvRecords.Count) records"
}
Write-Output "API port: $($cctvVars.PORT); private host: $($cctvVars.RAILWAY_PRIVATE_DOMAIN)"
