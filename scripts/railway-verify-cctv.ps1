$ErrorActionPreference = 'Stop'
$cctvVars = railway variable list --service impex-spot-api --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot read Railway configuration' }
$cctvBase = 'https://impex-spot-api-production.up.railway.app'
foreach ($cctvPath in @('/health/live', '/admin/cameras', '/api/pins/cctv')) {
  $cctvResponse = Invoke-WebRequest -Uri "$cctvBase$cctvPath" -SkipHttpErrorCheck
  Write-Output "$cctvPath HTTP $($cctvResponse.StatusCode)"
  if ($cctvResponse.StatusCode -ne 200) { throw 'A required public endpoint failed verification' }
}
$cctvDenied = Invoke-WebRequest -Uri "$cctvBase/api/admin/monitor" -SkipHttpErrorCheck
if ($cctvDenied.StatusCode -ne 401) { throw 'Anonymous camera admin access was not denied' }
Write-Output 'Anonymous camera admin access denied: 401'
$cctvLoginBody = @{username=$cctvVars.ADMIN_USERNAME;password=$cctvVars.ADMIN_PASSWORD} | ConvertTo-Json -Compress
$cctvLogin = Invoke-RestMethod -Uri "$cctvBase/api/admin/login" -Method Post -ContentType 'application/json' -Body $cctvLoginBody
if ($cctvLogin.user.id -eq 'env-admin') { throw 'Login still uses the environment fallback' }
$cctvHeaders = @{Authorization="Bearer $($cctvLogin.token)"}
$cctvCameras = Invoke-RestMethod -Uri "$cctvBase/api/admin/monitor" -Headers $cctvHeaders
Write-Output "Database admin login verified; CCTV camera count: $($cctvCameras.Count)"
foreach ($cctvItem in @('pins','responders')) {
  $cctvRecords = Invoke-RestMethod -Uri "$cctvBase/api/admin/$cctvItem" -Headers $cctvHeaders
  $cctvBackup = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot "../.local/cctv-backup/$cctvItem.json") | ConvertFrom-Json
  foreach ($cctvRecord in $cctvBackup) {
    if ($cctvRecord.id -notin $cctvRecords.id) { throw 'A backed-up record is missing from the new deployment' }
  }
  Write-Output "${cctvItem}: verified $($cctvBackup.Count) backed-up records are present"
}
$cctvUnknown = [guid]::NewGuid().ToString()
$cctvStream = Invoke-WebRequest -Uri "$cctvBase/streams/$cctvUnknown/index.m3u8" -SkipHttpErrorCheck
Write-Output "Unapproved HLS request HTTP $($cctvStream.StatusCode)"
if ($cctvStream.StatusCode -ne 403) { throw 'HLS edge authorization verification failed' }
Write-Output 'CCTV deployment verification passed'
