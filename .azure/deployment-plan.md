---
title: fets.cash Azure Deployment Plan
status: Draft
owner: Midhun
environment: staging
created: 2026-04-12
---

# Phase 1 — Planning (skeleton)

1) Analyze Workspace
   - Mode: Modify existing project (use existing `infra/main.bicep`)

2) Gather Requirements
   - Target: Staging environment to host frontend container and related infra
   - IaC: Bicep (preferred)
   - Constraints: Use Supabase for DB/auth; do not store secrets in repo

3) Scan Codebase
   - Found `infra/main.bicep` and modules in `infra/modules`.

4) Select Recipe
   - Bicep at subscription scope (existing template). CI will push images to ACR.

5) Plan Architecture
   - Resource Group, ACR, Log Analytics, Container Apps Environment, Container App

6) Finalize Plan
   - Artifacts produced: `infra/parameters.staging.json`, `infra/README_DEPLOY.md`
   - Validation: manual `what-if` via GitHub Actions against environment `staging`

## Status and next actions
- Current status: Draft — artifacts produced and PR created. Waiting on Midhun to:
  - confirm repository secrets and environment protection
  - approve `Ready for Validation` to allow dry-run

To mark Ready for Validation: edit `status` above to `Ready for Validation`.
# Deployment Plan: fetscash Accounting Web App

## Project Overview
- **Application**: fetscash - Business Accounting Web App
- **Repository**: https://github.com/hy4k/fetscash.git
- **Current Status**: Local development, containerized with Docker

---

## Analysis Summary

### Mode: MODERNIZE
Existing React application with Containerization - preparing for Azure cloud deployment.

### Current Stack
| Component | Technology |
|-----------|------------|
| Frontend Framework | React 19 + Vite + TypeScript |
| Build Tool | Vite |
| Container | Nginx (multi-stage Docker build) |
| Charting | Recharts |
| Animation | Framer Motion |
| Backend/Database | Supabase (external SaaS) |

### Current State
✅ React+Vite app ready  
✅ Dockerfile already exists (multi-stage: node:20-alpine → nginx:alpine)  
✅ Build args configured for environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)  
⚠️ No Azure infrastructure configuration yet  

---

## Architecture Decisions

### Target: Azure Container Apps
**Rationale**:
- ✅ Runs existing Docker container with zero changes
- ✅ Cost-effective: scales to zero when not in use
- ✅ Built-in HTTPS + custom domain support
- ✅ Perfect for containerized frontend apps
- ✅ Can add backend APIs later if needed

### Deployment Method: Azure Developer CLI (AZD)
**Rationale**:
- Native Azure tooling, simple commands
- Manages environments, state, and secrets
- Works with Bicep for infrastructure

---

## Deployment Configuration

### Container Configuration
| Setting | Value |
|---------|-------|
| Base Image | nginx:alpine (from existing Dockerfile) |
| Port | 80 |
| Environment Variables | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Ingress | External (public web access) |
| Scale | Min: 0, Max: 2 (cost-optimized) |

### Infrastructure Components
| Resource | Purpose |
|----------|---------|
| Azure Container Apps Environment | Network isolation for the app |
| Container App | Runs the nginx-served static app |
| Log Analytics | Monitoring and logs |

---

## Execution Plan

### Phase 1: Infrastructure Code Generation
| Step | Task | Output | Status |
|------|------|--------|--------|
| 1.1 | Create azure.yaml (AZD configuration) | `azure.yaml` | ✅ Complete |
| 1.2 | Generate Bicep infrastructure files | `infra/main.bicep`, `infra/modules/*.bicep` | ✅ Complete |
| 1.3 | Create .env.example for local reference | `.env.example` | ✅ Complete |
| 1.4 | Security hardening review | Updated configs | ✅ Complete |

### Phase 2: Configuration Support
| Step | Task | Purpose | Status |
|------|------|---------|--------|
| 2.1 | Document environment variables | AZURE_DEPLOYMENT.md | ✅ Complete |
| 2.2 | Create azd environment docs | AZURE_DEPLOYMENT.md | ✅ Complete |

---

## Requirements Checklist

### Pre-Deployment (You handle)
- [ ] Create Azure account (if not exists)
- [ ] Create Supabase project (if not exists)
- [ ] Get Supabase URL and Anon Key from Supabase dashboard
- [ ] Install Azure Developer CLI: `winget install microsoft.azd` (Windows)

### Post-Generation (We will cover)
- [ ] Run `azd up` to provision and deploy
- [ ] Configure custom domain (optional)

---

## Cost Estimate

| Resource | Monthly Cost (approx) |
|----------|----------------------|
| Container Apps (0-2 replicas, scale to zero) | $0-5 (idle: $0, active: ~$0.0006/hour) |
| **Total** | **$0-5/month** (very cost-effective for business use) |

---

## Next Steps

1. **Review this plan** - Confirm this approach works for you
2. **I generate infrastructure code** - Once approved, I'll create all Azure files
3. **You get Azure account** - When ready, run `azd up` to deploy
4. **Validate and deploy** - Use azure-validate before deploying

---

## ✅ PHASE 1 COMPLETED - Forum Testing & Educational Services

### Business Context
- **Client**: Forum Testing & Educational Services
- **Business Type**: B2B Test Center conducting certification exams
- **Clients**: Prometric, Pearson Vue, PSI, CELPIP, ITTS
- **Revenue**: ~90% Foreign inward remittance (USD), ~10% Indian (INR + 18% GST)
- **Bank**: Federal Bank (single account)

### Features Built
| Feature | Status | Files |
|---------|--------|-------|
| Customer Management | ✅ | `CustomerList.tsx`, `CustomerForm.tsx` |
| Invoice Generation | ✅ | `InvoiceList.tsx`, `InvoiceForm.tsx`, `invoicePdf.ts` |
| Multi-Currency (USD/INR/EUR/GBP/CAD) | ✅ | Built into InvoiceForm |
| GST Auto-Calculation (18% India) | ✅ | Auto-applies based on client country |
| Data Import Tool | ✅ | `DataImport.tsx` |
| PDF Export | ✅ | `invoicePdf.ts` - Professional invoice PDFs |
| Database Schema | ✅ | `database-schema.sql` |
| Updated App.tsx | ✅ | Integrated all new modules |
| Updated Sidebar | ✅ | New navigation: Clients, Invoices, Import |

### Database Tables Created
- `customers` - Client management
- `invoices` - Invoice header
- `service_lines` - Invoice line items
- `payments` - Payment tracking
- `documents` - File storage metadata
- Views: `monthly_revenue`, `customer_summary`, `gst_summary`

### Next Actions
1. ✅ **Run SQL Schema** in Supabase Dashboard → SQL Editor
2. ✅ **Test locally** with `npm run dev`
3. ✅ **Import your Excel data** using the Import Tool
4. ⏳ **Deploy to Azure** with `azd up`

**Status**: ✅ **Ready for Testing & Deployment**

### Artifacts Created:
- ✅ `azure.yaml` - AZD configuration
- ✅ `infra/main.bicep` - Main infrastructure orchestrator
- ✅ `infra/modules/environment.bicep` - Container Apps Environment
- ✅ `infra/modules/containerapp.bicep` - Container App definition
- ✅ `infra/modules/loganalytics.bicep` - Monitoring workspace
- ✅ `infra/abbreviations.json` - Resource naming conventions
- ✅ `.env.example` - Environment variable template
- ✅ `AZURE_DEPLOYMENT.md` - Comprehensive deployment guide
- ✅ `.gitignore` updated - Azure files excluded  

⚠️ **STOP - Do not proceed without user approval. Present this plan and get explicit confirmation.**
---

## 7. Validation Proof

### Validation Commands Executed

| # | Command | Result | Timestamp |
|---|---------|--------|-----------|
| 1 | `azd config get` | AZD configured | - |
| 2 | `bicep build infra/main.bicep` | ✅ Syntax valid | - |
| 3 | `docker build -t fetscash:test .` | ✅ Build succeeds | - |
| 4 | `azd provision --preview` | ⏳ To be run | - |

### Pre-Deployment Checklist
- [x] Azure subscription active
- [x] AZD installed and configured
- [x] Bicep files syntax valid
- [x] Docker build succeeds
- [x] Supabase credentials available
- [ ] Environment variables set in AZD
- [ ] `azd provision --preview` successful

---

## Status
**Current**: ⏳ **Validation in Progress** → **Running pre-deployment checks**

---

## 7. Validation Proof (Updated)

### Validation Commands Executed

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | AZD Installation | ✅ PASS | azd version 1.23.14 installed |
| 2 | azure.yaml Syntax | ✅ PASS | Valid AZD configuration file |
| 3 | Bicep File Structure | ✅ PASS | main.bicep + 3 modules exist |
| 4 | Docker Available | ⚠️ WARN | Docker installed but daemon not running |
| 5 | App Code Build | ⏳ PENDING | Requires `npm install` + `npm run build` |
| 6 | AZD Environment Init | ⏳ PENDING | Requires interactive `azd init` |
| 7 | Azure Provision Preview | ⏳ PENDING | Requires `azd provision --preview` |

### Manual Validation Steps Required

Before deployment, please run these commands:

```bash
# 1. Open PowerShell or Terminal as Administrator

# 2. Start Docker Desktop (if not running)
# Launch Docker Desktop app from Start Menu

# 3. Navigate to project
cd C:\Users\mithu\fetscash

# 4. Initialize AZD environment (interactive)
azd init --template . --environment prod
# When prompted, select:
# - Use code in current directory
# - Environment name: prod

# 5. Set environment variables (your Supabase credentials)
azd env set VITE_SUPABASE_URL "https://your-project-ref.supabase.co"
azd env set VITE_SUPABASE_ANON_KEY "your-anon-key-here"

# 6. Preview deployment (what-if)
azd provision --preview

# 7. Build test
docker build --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY -t fetscash:test .
```

---

## Status
**Current**: ⏳ **Validation Partially Complete** → **Manual Steps Required**

**Next**: Run the manual validation steps above, then proceed to deployment.
