# Provisions GCP resources for Thread & Pixel. Safe to re-run (skips what already exists).
param(
    [string]$Project = "datavision-482713",
    [string]$Region = "asia-southeast1"
)
# Native stderr must not be terminating on PS 5.1; failures are checked via $LASTEXITCODE.
$ErrorActionPreference = "Continue"
$gcloud = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $gcloud)) { $gcloud = "gcloud" }

$SA = "tp-runtime@$Project.iam.gserviceaccount.com"
$Bucket = "tp-assets-$Project"
$Me = (& $gcloud config get-value account 2>$null)

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Exists([scriptblock]$cmd) { & $cmd 2>&1 | Out-Null; return $LASTEXITCODE -eq 0 }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "Failed: $what" } }

& $gcloud config set project $Project | Out-Null

Step "Enabling APIs"
& $gcloud services enable aiplatform.googleapis.com run.googleapis.com cloudbuild.googleapis.com `
    artifactregistry.googleapis.com firestore.googleapis.com storage.googleapis.com `
    iamcredentials.googleapis.com firebase.googleapis.com identitytoolkit.googleapis.com

Step "Firestore (native, $Region)"
$dbs = & $gcloud firestore databases list --format="value(name)" 2>$null
if (-not ($dbs -match "/databases/\(default\)")) {
    & $gcloud firestore databases create --location=$Region --type=firestore-native
} else { Write-Host "exists" }

Step "Bucket gs://$Bucket"
if (-not (Exists { & $gcloud storage buckets describe "gs://$Bucket" --format="value(name)" })) {
    & $gcloud storage buckets create "gs://$Bucket" --location=$Region --uniform-bucket-level-access --public-access-prevention
    Check "bucket create"
} else { Write-Host "exists" }
$lifecycle = Join-Path $env:TEMP "tp-lifecycle.json"
'{"rule":[{"action":{"type":"Delete"},"condition":{"age":7,"matchesPrefix":["uploads/","smoke/"]}}]}' | Set-Content -Encoding ascii $lifecycle
& $gcloud storage buckets update "gs://$Bucket" --lifecycle-file=$lifecycle
Check "bucket lifecycle"

Step "Runtime service account $SA"
if (-not (Exists { & $gcloud iam service-accounts describe $SA --format="value(email)" })) {
    & $gcloud iam service-accounts create tp-runtime --display-name="Thread & Pixel runtime"
    Check "service account create"
    Start-Sleep -Seconds 10  # IAM propagation before bindings
} else { Write-Host "exists" }

Step "IAM bindings (least privilege)"
foreach ($role in "roles/aiplatform.user", "roles/datastore.user") {
    & $gcloud projects add-iam-policy-binding $Project --member="serviceAccount:$SA" --role=$role --condition=None --quiet | Out-Null
    Check "bind $role"
}
& $gcloud storage buckets add-iam-policy-binding "gs://$Bucket" --member="serviceAccount:$SA" --role="roles/storage.objectAdmin" | Out-Null
Check "bucket objectAdmin"
# Runtime SA signs its own GCS URLs; you need the same to sign URLs locally.
& $gcloud iam service-accounts add-iam-policy-binding $SA --member="serviceAccount:$SA" --role="roles/iam.serviceAccountTokenCreator" | Out-Null
Check "SA self tokenCreator"
& $gcloud iam service-accounts add-iam-policy-binding $SA --member="user:$Me" --role="roles/iam.serviceAccountTokenCreator" | Out-Null
Check "user tokenCreator"

Step "Done"
Write-Host "Bucket:  gs://$Bucket"
Write-Host "Runtime: $SA"
Write-Host "Next: enable Firebase on the project + Google/Anonymous auth providers in the Firebase console."
