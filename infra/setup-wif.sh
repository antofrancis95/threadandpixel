#!/usr/bin/env bash
set -euo pipefail

# Configuration defaults
PROJECT_ID="${1:-datavision-482713}"
REGION="${2:-us-central1}"
GITHUB_REPO="${3:-antofrancis95/thread-pixel}"
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-provider"
DEPLOYER_SA="tp-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="tp-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=========================================================="
echo " Setting up Workload Identity Federation (WIF) for GitHub"
echo " Project:     ${PROJECT_ID}"
echo " Region:      ${REGION}"
echo " Repository:  ${GITHUB_REPO}"
echo " Deployer SA: ${DEPLOYER_SA}"
echo "=========================================================="

# 1. Verify Prerequisites
if ! command -v gcloud &> /dev/null; then
  echo "Error: gcloud CLI is not installed."
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "Error: gh (GitHub CLI) is not installed."
  exit 1
fi

# Ensure gcloud project is set
gcloud config set project "${PROJECT_ID}" --quiet

# 2. Enable Required APIs
echo "==> Enabling required GCP APIs..."
gcloud services enable \
  iamcredentials.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT_ID}"

# 3. Retrieve Project Number
PROJECT_NUM=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
echo "GCP Project Number: ${PROJECT_NUM}"

# 4. Create Workload Identity Pool (if not exists)
echo "==> Checking Workload Identity Pool..."
if ! gcloud iam workload-identity-pools describe "${POOL_NAME}" --project="${PROJECT_ID}" --location="global" &> /dev/null; then
  echo "Creating Workload Identity Pool: ${POOL_NAME}..."
  gcloud iam workload-identity-pools create "${POOL_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"
else
  echo "Workload Identity Pool ${POOL_NAME} already exists."
fi

# 5. Create Workload Identity Provider (if not exists)
echo "==> Checking Workload Identity Provider..."
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" --location="global" --workload-identity-pool="${POOL_NAME}" &> /dev/null; then
  echo "Creating OIDC Provider: ${PROVIDER_NAME}..."
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --display-name="GitHub Provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}'"
else
  echo "Workload Identity Provider ${PROVIDER_NAME} already exists."
fi

# 6. Create Deployment Service Account (if not exists)
echo "==> Checking Deployer Service Account (${DEPLOYER_SA})..."
if ! gcloud iam service-accounts describe "${DEPLOYER_SA}" --project="${PROJECT_ID}" &> /dev/null; then
  echo "Creating service account tp-deployer..."
  gcloud iam service-accounts create tp-deployer \
    --project="${PROJECT_ID}" \
    --display-name="Thread & Pixel GitHub Deployer"
  sleep 5
else
  echo "Deployer service account already exists."
fi

# 7. Grant Necessary IAM Roles to tp-deployer
echo "==> Granting IAM roles to ${DEPLOYER_SA}..."
for role in "roles/run.admin" "roles/cloudbuild.builds.editor" "roles/storage.admin" "roles/artifactregistry.admin"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${DEPLOYER_SA}" \
    --role="${role}" \
    --condition=None --quiet > /dev/null
done

# Allow deployer SA to impersonate/act as runtime SA
echo "==> Allowing tp-deployer to act as ${RUNTIME_SA}..."
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None --quiet > /dev/null || true

# 8. Allow GitHub Actions Repo to Impersonate tp-deployer
echo "==> Binding GitHub Repository to tp-deployer via Workload Identity..."
gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_SA}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUM}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}" \
  --condition=None --quiet > /dev/null

WIF_PROVIDER="projects/${PROJECT_NUM}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"

echo ""
echo "=========================================================="
echo " GCP WIF Configuration Complete!"
echo " WIF Provider:        ${WIF_PROVIDER}"
echo " WIF Service Account: ${DEPLOYER_SA}"
echo "=========================================================="
echo ""

# 9. Configure GitHub Secrets & Variables automatically using gh CLI
echo "==> Configuring GitHub Repository Secrets and Variables via gh CLI..."

gh secret set WIF_PROVIDER -b "${WIF_PROVIDER}" --repo "${GITHUB_REPO}"
gh secret set WIF_SERVICE_ACCOUNT -b "${DEPLOYER_SA}" --repo "${GITHUB_REPO}"

# Check for FIREBASE_CONFIG in web/.env.local or api/.env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "${ROOT_DIR}/web/.env.local" ]; then
  FIREBASE_CFG=$(grep -E '^FIREBASE_CONFIG=' "${ROOT_DIR}/web/.env.local" | sed 's/^FIREBASE_CONFIG=//' || true)
  if [ -n "${FIREBASE_CFG}" ]; then
    echo "Found FIREBASE_CONFIG in web/.env.local, uploading to GitHub Secrets..."
    gh secret set FIREBASE_CONFIG -b "${FIREBASE_CFG}" --repo "${GITHUB_REPO}"
  fi
fi

# Set non-secret repository variables
echo "Setting GitHub Actions Variables..."
gh variable set GCP_PROJECT_ID -b "${PROJECT_ID}" --repo "${GITHUB_REPO}"
gh variable set GCP_REGION -b "${REGION}" --repo "${GITHUB_REPO}"
gh variable set ASSET_BUCKET -b "tp-assets-${PROJECT_ID}" --repo "${GITHUB_REPO}"
gh variable set RUNTIME_SA -b "${RUNTIME_SA}" --repo "${GITHUB_REPO}"
gh variable set MIN_INSTANCES -b "1" --repo "${GITHUB_REPO}"
gh variable set GEMINI_LOCATION -b "global" --repo "${GITHUB_REPO}"
gh variable set LIVE_LOCATION -b "us-central1" --repo "${GITHUB_REPO}"
gh variable set MODEL_FLASH -b "gemini-3.8-flash" --repo "${GITHUB_REPO}"
gh variable set MODEL_LITE -b "gemini-3.5-flash-lite" --repo "${GITHUB_REPO}"
gh variable set MODEL_PRO -b "gemini-3.1-pro-preview" --repo "${GITHUB_REPO}"
gh variable set MODEL_IMAGE -b "gemini-nano-banana-2.1" --repo "${GITHUB_REPO}"
gh variable set MODEL_VTO -b "virtual-try-on-001" --repo "${GITHUB_REPO}"
gh variable set MODEL_VIDEO -b "veo-3.1-fast-generate-001" --repo "${GITHUB_REPO}"
gh variable set MODEL_LIVE -b "gemini-3.8-live" --repo "${GITHUB_REPO}"
gh variable set DEMO_MODE -b "off" --repo "${GITHUB_REPO}"
gh variable set DEMO_TIMEOUT_S -b "25" --repo "${GITHUB_REPO}"

echo ""
echo "🎉 Setup complete! All GitHub Secrets and Variables have been configured."
echo "You can now run or push commits to trigger the CI/CD pipeline."
