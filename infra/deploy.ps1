# Deploys tp-api and tp-web to Cloud Run (builds from source with Cloud Build).
param(
    [string]$Project = "datavision-482713",
    [string]$Region = "us-central1",
    [Parameter(Mandatory = $true)][string]$FirebaseConfigJson
)
$ErrorActionPreference = "Continue"
$gcloud = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $gcloud)) { $gcloud = "gcloud" }
$root = Split-Path $PSScriptRoot -Parent
$SA = "tp-runtime@$Project.iam.gserviceaccount.com"

$apiEnv = Get-Content (Join-Path $root "api\.env") |
    Where-Object { $_ -match "^(MODEL_\w+|GEMINI_LOCATION|LIVE_LOCATION|DEMO_\w+)=" } |
    ForEach-Object { $_.Trim() }

Write-Host "==> Deploying tp-api" -ForegroundColor Cyan
$envVars = @("GOOGLE_CLOUD_PROJECT=$Project", "GOOGLE_CLOUD_REGION=$Region", "ASSET_BUCKET=tp-assets-$Project",
    "ALLOWED_ORIGINS=http://localhost:3000") + $apiEnv
& $gcloud run deploy tp-api --source (Join-Path $root "api") --project $Project --region $Region `
    --service-account $SA --allow-unauthenticated --memory 1Gi --timeout 3600 --min-instances 1 `
    --set-env-vars ($envVars -join ",")
if ($LASTEXITCODE -ne 0) { throw "tp-api deploy failed" }
$apiUrl = & $gcloud run services describe tp-api --project $Project --region $Region --format="value(status.url)"

Write-Host "==> Deploying tp-web" -ForegroundColor Cyan
# '^@^' switches the gcloud list delimiter so the JSON's commas survive.
& $gcloud run deploy tp-web --source (Join-Path $root "web") --project $Project --region $Region `
    --allow-unauthenticated --memory 512Mi --min-instances 1 `
    --set-env-vars "^@^API_URL=$apiUrl@FIREBASE_CONFIG=$FirebaseConfigJson"
if ($LASTEXITCODE -ne 0) { throw "tp-web deploy failed" }
$webUrl = & $gcloud run services describe tp-web --project $Project --region $Region --format="value(status.url)"

Write-Host "==> Locking API CORS to $webUrl" -ForegroundColor Cyan
& $gcloud run services update tp-api --project $Project --region $Region `
    --update-env-vars "^@^ALLOWED_ORIGINS=$webUrl,http://localhost:3000"

Write-Host "`nAPI: $apiUrl`nWeb: $webUrl"
Write-Host "Add $($webUrl -replace '^https://','') to Firebase Auth > Settings > Authorized domains."
