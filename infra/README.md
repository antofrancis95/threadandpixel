# Cloud Infrastructure & CI/CD Deployment

This directory contains infrastructure setup and deployment scripts for **Thread & Pixel** on Google Cloud Run.

## Architecture

- **`tp-api`**: FastAPI backend on Cloud Run (`python:3.12-slim`).
  - Runtime Service Account: `tp-runtime@datavision-482713.iam.gserviceaccount.com`
  - Access to Vertex AI Gemini models, Firestore, and Cloud Storage bucket.
- **`tp-web`**: Next.js 15 frontend on Cloud Run (`node:20-alpine`, standalone output).
  - Runtime configuration: `API_URL` and `FIREBASE_CONFIG` injected at runtime.
- **CI/CD**: GitHub Actions using **Workload Identity Federation (WIF)** for keyless authentication.

---

## 1. One-Time Setup for GitHub Actions (WIF)

Ensure you are logged into both `gcloud` and `gh` CLIs:

```bash
gcloud auth login
gcloud config set project datavision-482713
gh auth login
```

Run the automated WIF configuration script:

```bash
./infra/setup-wif.sh
```

*(On Windows PowerShell, run `.\infra\setup-wif.ps1`)*

This script automatically:
1. Enables required GCP APIs (`iamcredentials`, `run`, `cloudbuild`, `storage`).
2. Creates the Workload Identity Pool (`github-actions-pool`) and Provider (`github-provider`).
3. Provisions the deployment service account `tp-deployer`.
4. Grants least-privilege IAM roles (`roles/run.admin`, `roles/cloudbuild.builds.editor`, `roles/storage.admin`, and `roles/iam.serviceAccountUser`).
5. Configures all GitHub Actions Secrets (`WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `FIREBASE_CONFIG`) and repository variables (`GCP_PROJECT_ID`, `GCP_REGION`, model IDs, etc.) via GitHub CLI.

---

## 2. GitHub Actions Workflows

- **`.github/workflows/ci.yml`**:
  - Triggers on Pull Requests to `main`.
  - Runs FastAPI `pytest` unit tests.
  - Runs Next.js `typecheck` and test build.
- **`.github/workflows/deploy.yml`**:
  - Triggers on push to `main` or manual trigger (`workflow_dispatch`).
  - Deploys `tp-api` to Cloud Run.
  - Deploys `tp-web` to Cloud Run with `API_URL`.
  - Updates `tp-api`'s `ALLOWED_ORIGINS` to lock down CORS to the live web domain.
