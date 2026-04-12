fets.cash — Deployment README

Overview
- Artifacts: `infra/main.bicep`, `infra/parameters.staging.json`
- Purpose: Provide the Bicep template and a parameter file to deploy `fets.cash`.
- Note: This repo-only flow produces artifacts for review; no CLI commands will
  be executed without `Midhun`'s explicit `I approve`.

Prepare
1) Populate secrets in `infra/parameters.staging.json`:
   - `supabaseUrl`: your Supabase project URL
   - `supabaseAnonKey`: your Supabase anon public key
   - `containerRegistryEndpoint`: set to your ACR login server, e.g. `myacr.azurecr.io/fetscash:latest`

Validation (dry-run)
- Build Bicep to JSON
```powershell
az bicep build --file infra/main.bicep
```
- What-if (subscription-scope)
```powershell
az deployment sub what-if --location eastus2 --template-file infra/main.json --parameters @infra/parameters.staging.json
```

Create Resource Group (optional)
```powershell
az group create --name fetscash-staging-rg --location eastus2
```

Deploy (requires approval)
```powershell
az deployment sub create --location eastus2 --template-file infra/main.json --parameters @infra/parameters.staging.json
```

Post-deploy checks
- Check outputs:
```powershell
# Replace <DEPLOYMENT_NAME> if using deployment name flow
az deployment sub show --name <DEPLOYMENT_NAME> --query properties.outputs
```
- Verify Container App FQDN from `SERVICE_WEB_ENDPOINTS` output and open in browser.

PR-ready patch info
- I generated a small explanatory change in `infra/main.bicep` and a parameter
  template at `infra/parameters.staging.json`.
- If you want a single PR that wires a fixed `containerRegistryEndpoint`, reply
  "I approve: create PR patch" and I will stage a patch that updates `main.bicep`
  and adds a parameter file ready to commit.

Support notes for Midhun (no-code friendly)
- Think of the Resource Group as a project folder that holds everything.
- ACR is like an image library (similar to storing a prebuilt site archive in
  Coolify). Instead of uploading via GUI, we provide the ACR path in the
  parameter file and the template will reference it.
- I will always present exact commands and plain-English summaries before any
  execution.

GitHub Actions (CI/CD) — artifacts only
- `CI: Build and push frontend image` (`.github/workflows/ci-build-push.yml`)
  - Builds the static frontend, builds a Docker image, and pushes it to your
    ACR. Requires these repository secrets to be configured: `ACR_LOGIN_SERVER`,
    `ACR_USERNAME`, `ACR_PASSWORD`.
  - It writes the pushed image reference to `infra/latest_image.txt` for
    downstream use.
- `Validate Bicep (manual)` (`.github/workflows/validate-bicep.yml`)
  - Manual workflow to build the Bicep template and run a `what-if` (dry-run)
    at subscription scope. Requires an Azure service principal stored as
    `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_CLIENT_SECRET` in
    repository secrets.

How to enable
1) Add repository secrets via GitHub > Settings > Secrets:
   - `ACR_LOGIN_SERVER`, `ACR_USERNAME`, `ACR_PASSWORD`
   - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`
2) Trigger `ci-build-push` by pushing to `master` or via `Actions` → `Run workflow`.
3) Trigger `validate-bicep` via `Actions` → `Run workflow` (manual).

Security and approval
- Workflows are created as artifacts only. They will not be triggered by me.
- The `validate-bicep` workflow performs dry-run checks only; it does not apply
  changes. Any apply step will require explicit approval and additional
  automation with protected environments or manual confirmation.

Creating a protected environment for validation (recommended)
1) In GitHub, go to `Settings` → `Environments` → `New environment` and create
  an environment named `staging`.
2) Under `Deployment protection rules`, add at least one required reviewer
  (for example your GitHub username) so manual approvals are required before
  the `validate-bicep` workflow runs.
3) Add the required secrets to the environment (optional): `AZURE_CLIENT_ID`,
  `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`. Secrets added to an environment are
  only available to runs that target that environment.

Notes:
- The `validate-bicep` workflow references the `staging` environment; when the
  environment has protection rules the workflow run will pause and require an
  approver to confirm. This ensures no dry-run or apply happens without your
  explicit approval.
- I will not run any workflows or attempt to deploy resources until you both
  (a) provide the necessary secrets and (b) give an explicit `I approve`.
