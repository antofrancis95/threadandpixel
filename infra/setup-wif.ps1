# Sets up Workload Identity Federation (WIF) for GitHub Actions on GCP
param(
    [string]$Project = "datavision-482713",
    [string]$Region = "asia-southeast1",
    [string]$GithubRepo = "antofrancis95/thread-pixel"
)

$ErrorActionPreference = "Stop"
$PoolName = "github-actions-pool"
$ProviderName = "github-provider"
$DeployerSA = "tp-deployer@$Project.iam.gserviceaccount.com"
$RuntimeSA = "tp-runtime@$Project.iam.gserviceaccount.com"

Write-Host "==> Configuring gcloud project: $Project" -ForegroundColor Cyan
& gcloud config set project $Project | Out-Null

Write-Host "==> Enabling APIs..." -ForegroundColor Cyan
& gcloud services enable iamcredentials.googleapis.com cloudbuild.googleapis.com run.googleapis.com storage.googleapis.com artifactregistry.googleapis.com --project=$Project

$ProjectNum = & gcloud projects describe $Project --format="value(projectNumber)"

# Workload Identity Pool
Write-Host "==> Configuring Workload Identity Pool..." -ForegroundColor Cyan
$poolExists = & gcloud iam workload-identity-pools describe $PoolName --project=$Project --location="global" 2>$null
if (-not $poolExists) {
    & gcloud iam workload-identity-pools create $PoolName --project=$Project --location="global" --display-name="GitHub Actions Pool"
}

# Workload Identity Provider
Write-Host "==> Configuring Workload Identity Provider..." -ForegroundColor Cyan
$providerExists = & gcloud iam workload-identity-pools providers describe $ProviderName --project=$Project --location="global" --workload-identity-pool=$PoolName 2>$null
if (-not $providerExists) {
    & gcloud iam workload-identity-pools providers create-oidc $ProviderName `
        --project=$Project --location="global" --workload-identity-pool=$PoolName `
        --display-name="GitHub Provider" `
        --issuer-uri="https://token.actions.githubusercontent.com" `
        --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" `
        --attribute-condition="assertion.repository == '$GithubRepo'"
}

# Deployer SA
Write-Host "==> Configuring Deployer Service Account..." -ForegroundColor Cyan
$saExists = & gcloud iam service-accounts describe $DeployerSA --project=$Project 2>$null
if (-not $saExists) {
    & gcloud iam service-accounts create tp-deployer --project=$Project --display-name="Thread & Pixel GitHub Deployer"
    Start-Sleep -Seconds 5
}

# Roles
foreach ($role in "roles/run.admin", "roles/cloudbuild.builds.editor", "roles/storage.admin", "roles/artifactregistry.admin") {
    & gcloud projects add-iam-policy-binding $Project --member="serviceAccount:$DeployerSA" --role=$role --condition=None --quiet | Out-Null
}
& gcloud iam service-accounts add-iam-policy-binding $RuntimeSA --project=$Project --member="serviceAccount:$DeployerSA" --role="roles/iam.serviceAccountUser" --condition=None --quiet 2>$null | Out-Null

$BuildSA = "$ProjectNum-compute@developer.gserviceaccount.com"
& gcloud iam service-accounts add-iam-policy-binding $BuildSA --project=$Project --member="serviceAccount:$DeployerSA" --role="roles/iam.serviceAccountUser" --condition=None --quiet 2>$null | Out-Null

# Impersonation
$member = "principalSet://iam.googleapis.com/projects/$ProjectNum/locations/global/workloadIdentityPools/$PoolName/attribute.repository/$GithubRepo"
& gcloud iam service-accounts add-iam-policy-binding $DeployerSA --project=$Project --role="roles/iam.workloadIdentityUser" --member=$member --condition=None --quiet | Out-Null

$WifProvider = "projects/$ProjectNum/locations/global/workloadIdentityPools/$PoolName/providers/$ProviderName"

Write-Host "`nWIF Provider: $WifProvider" -ForegroundColor Green
Write-Host "Deployer SA:  $DeployerSA`n" -ForegroundColor Green

# Configure GitHub CLI secrets and variables
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "==> Configuring GitHub Repository Secrets and Variables via gh CLI..." -ForegroundColor Cyan
    & gh secret set WIF_PROVIDER -b "$WifProvider" --repo "$GithubRepo"
    & gh secret set WIF_SERVICE_ACCOUNT -b "$DeployerSA" --repo "$GithubRepo"

    $root = Split-Path $PSScriptRoot -Parent
    $webEnv = Join-Path $root "web\.env.local"
    if (Test-Path $webEnv) {
        $cfg = (Get-Content $webEnv | Where-Object { $_ -match "^FIREBASE_CONFIG=" }) -replace "^FIREBASE_CONFIG=",""
        if ($cfg) {
            & gh secret set FIREBASE_CONFIG -b "$cfg" --repo "$GithubRepo"
        }
    }

    & gh variable set GCP_PROJECT_ID -b "$Project" --repo "$GithubRepo"
    & gh variable set GCP_REGION -b "$Region" --repo "$GithubRepo"
    & gh variable set ASSET_BUCKET -b "tp-assets-$Project" --repo "$GithubRepo"
    & gh variable set RUNTIME_SA -b "$RuntimeSA" --repo "$GithubRepo"
    & gh variable set MIN_INSTANCES -b "1" --repo "$GithubRepo"
    & gh variable set GEMINI_LOCATION -b "global" --repo "$GithubRepo"
    & gh variable set LIVE_LOCATION -b "us-central1" --repo "$GithubRepo"
    & gh variable set MODEL_FLASH -b "gemini-3.8-flash" --repo "$GithubRepo"
    & gh variable set MODEL_LITE -b "gemini-3.5-flash-lite" --repo "$GithubRepo"
    & gh variable set MODEL_PRO -b "gemini-3.1-pro-preview" --repo "$GithubRepo"
    & gh variable set MODEL_IMAGE -b "gemini-nano-banana-2.1" --repo "$GithubRepo"
    & gh variable set MODEL_VTO -b "virtual-try-on-001" --repo "$GithubRepo"
    & gh variable set MODEL_VIDEO -b "veo-3.1-fast-generate-001" --repo "$GithubRepo"
    & gh variable set MODEL_LIVE -b "gemini-3.8-live" --repo "$GithubRepo"
    & gh variable set DEMO_MODE -b "off" --repo "$GithubRepo"
    & gh variable set DEMO_TIMEOUT_S -b "25" --repo "$GithubRepo"
    Write-Host "Done setting GitHub secrets and variables!" -ForegroundColor Green
}
