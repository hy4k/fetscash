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
