# ☁️ Azure Deployment Guide - fetscash

This guide covers deploying your **fetscash** accounting app to **Azure Container Apps**.

---

## 📦 What's Already Configured

Your project now includes:

| File | Purpose |
|------|---------|
| `azure.yaml` | Azure Developer CLI configuration |
| `infra/main.bicep` | Main Azure infrastructure orchestrator |
| `infra/modules/` | Modular Bicep templates (Environment, Container App, Log Analytics) |
| `infra/abbreviations.json` | Naming convention definitions |
| `.env.example` | Environment variable template |

---

## 🚀 Quick Start

### Prerequisites
Before deploying, ensure you have:
- ✅ Azure account (with active subscription)
- ✅ [Azure Developer CLI (azd)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd) installed
- ✅ Your Supabase credentials (URL + Anon Key)

### 1. Initialize AZD Environment

```bash
# Navigate to project root
cd ~/fetscash

# Initialize azd environment (creates .azure folder)
azd init

# When prompted:
# - Template: "Use code in the current directory"
# - Environment name: "prod" (or "dev" for testing)
```

### 2. Configure Environment Variables

```bash
# Set your Supabase credentials
azd env set SUPABASE_URL "https://your-project-ref.supabase.co"
azd env set SUPABASE_ANON_KEY "your-actual-anon-key-here"

# Optional: Set custom domain
# azd env set CUSTOM_DOMAIN "fetscash.com"
```

### 3. Provision Infrastructure

```bash
# Review what will be created (safety check)
azd provision --preview

# Provision resources (takes 2-5 minutes)
azd provision
```

This creates:
- Azure Resource Group
- Log Analytics Workspace
- Container Apps Environment
- Container App (fetscash)

### 4. Deploy Application

```bash
# Build Docker image and deploy to Azure
azd deploy

# Or do it all in one command (provision + deploy)
azd up
```

---

## 🌐 Domain Configuration

### Default URL
After deployment, your app will be available at:
```
https://<container-app-name>.<unique-code>.<location>.azurecontainerapps.io
```

### Custom Domain (fetscash.com)

To use your existing domains:

1. **In Azure Portal**:
   - Go to your Container App
   - Settings → Custom domains
   - Add domain: `fetscash.com`

2. **In your DNS provider**:
   - Point `fetscash.com` → Container App's default URL
   - CNAME record for `www.fetscash.com` → same URL

3. **Paybook subdomain**:
   - Repeat for `paybook.fetscash.com`
   - Or configure as a separate Container App in `infra/main.bicep`

---

## 💰 Cost Management

Your Container App is configured to scale to zero:

| State | Cost |
|-------|------|
| **No traffic (idle)** | **$0/month** |
| **Active usage** | ~$0.0006/hour | 
| **~10K requests/day** | ~$3-5/month |

**Cost-saving features enabled**:
- ✅ Min replicas: 0 (scales to zero)
- ✅ Max replicas: 3 (caps costs during spikes)
- ✅ Log Analytics: 30-day retention

---

## 🔧 Daily Operations

### Update Code & Redeploy

```bash
# After making code changes:
git add .
git commit -m "Your update message"

# Deploy new version
azd deploy
```

### View Logs

```bash
# Stream logs in real-time
azd monitor --live

# Or use Azure CLI
az containerapp logs show --name <app-name> --resource-group <rg-name> --follow
```

### Environment Variables

```bash
# List all environment variables
azd env get-values

# Update an environment variable
azd env set SUPABASE_URL "https://new-ref.supabase.co"

# Re-deploy to apply changes
azd deploy
```

---

## 🔄 Migrating from Hostinger VPS

### Current State (Hostinger)
- fetscash.com → VPS IP
- paybook.fetscash.com → VPS IP

### Migration Steps

1. **Deploy to Azure** (follow Quick Start above)
2. **Test the Azure deployment** on the temporary `.azurecontainerapps.io` domain
3. **Update DNS records**:
   - Log into your DNS provider
   - Update A records:
     - `fetscash.com` → Azure Container App IP (shown in Portal)
     - `paybook.fetscash.com` → Same IP or separate Container App

4. **SSL/TLS**: Azure automatically provisions certificates for custom domains
5. **Keep Hostinger running** for 24-48 hours as backup during DNS propagation

---

## 🛡️ Security & Best Practices

### Securing Supabase Keys
**Current**: Keys are build-time environment variables (visible in container)
**Recommended for Production**:

```bash
# Store secrets in Azure Key Vault
az keyvault create --name "kv-fetscash" --resource-group "rg-fetscash-prod"

# Add your secrets
az keyvault secret set --vault-name "kv-fetscash" --name "SupabaseAnonKey" --value "your-key"

# Reference in Container App (requires update to infra/modules/containerapp.bicep)
```

### HTTPS Enforcement
- ✅ Configured to redirect HTTP → HTTPS
- ✅ TLS 1.2+ enforced by Azure

---

## 📊 Monitoring & Alerts

### Built-in Metrics (Azure Portal)
- Container restarts
- Request latency
- Error rates
- Resource utilization (CPU/Memory)

### Set Up Alerts

```bash
# Create alert for high error rates
az monitor metrics alert create \
  --name "fetscash-errors" \
  --resource-group "rg-fetscash-prod" \
  --condition "avg requests > 5" \
  --description "Alert when error rate is high"
```

---

## 🆘 Troubleshooting

### Container Won't Start
```bash
# Check provisioning state
az containerapp show --name <app-name> --resource-group <rg-name>

# View recent events
az containerapp revision list --name <app-name> --resource-group <rg-name>
```

### Supabase Connection Issues
- Verify `SUPBASE_URL` and `SUPBASE_ANON_KEY` in environment variables
- Check Supabase project's allowed origins (add your Azure domain)

### Build Failures
```bash
# Test build locally
docker build --build-arg VITE_SUPABASE_URL=your-url --build-arg VITE_SUPABASE_ANON_KEY=your-key -t fetscash:test .
```

---

## 💡 Next Steps

| Feature | Suggested Approach |
|---------|-------------------|
| **CI/CD Pipeline** | GitHub Actions + azd |
| **Staging Environment** | Create separate azd environment: `azd env new staging` |
| **Backend API** | Add Azure Functions or another Container App |
| **Database Migration** | Consider Azure SQL or Cosmos DB + Supabase |
| **File Storage** | Azure Blob Storage for document uploads |

---

## 📚 Resources

- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure Developer CLI (azd) Reference](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [azd GitHub Actions](https://learn.microsoft.com/azure/developer/azure-developer-cli/configure-dev-env?tabs=GitHub%2Cmacos-instructions%2Cvisual-studio%2Cdeploy-with-azd%2Cazd-strategy%2Cazd-create-config%2Cazure-activity-log#github-action)

---

**Questions?** 
The `azure-validate` skill can help validate your configuration before deploying.

**Ready to Deploy?** Run: `azd up`