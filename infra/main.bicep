targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment')
param environmentName string

@description('Primary location for all resources')
param location string = 'eastus2'

@description('Supabase Project URL')
@secure()
param supabaseUrl string

@description('Supabase Anonymous Key')
@secure()
param supabaseAnonKey string

@description('Container Registry endpoint from AZD')
param containerRegistryEndpoint string = ''
// Example usage: set `containerRegistryEndpoint` in a parameters file to
// "myregistry.azurecr.io/fetscash:latest" to use a prebuilt image from ACR.
// See infra/parameters.staging.json for a template.

@description('External ACR login server to authenticate against (overrides the Bicep-created ACR)')
param acrLoginServerOverride string = ''

@description('External ACR admin username')
@secure()
param acrUsernameOverride string = ''

@description('External ACR admin password')
@secure()
param acrPasswordOverride string = ''

// Tags
param tags object = {
  azdEnvName: environmentName
  project: 'fetscash'
  owner: 'hy4k'
}

// Generate resource names
var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var nameToken = '${abbrs.containerApps}fetscash-${resourceToken}'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${abbrs.resourceGroup}${environmentName}'
  location: location
  tags: tags
}

// Container Registry (Scoped to Resource Group)
module containerRegistry 'modules/containerRegistry.bicep' = {
  name: 'containerRegistry'
  scope: rg
  params: {
    name: '${abbrs.containerRegistries}${resourceToken}'
    location: location
    tags: tags
  }
}

// Log Analytics
module logAnalytics 'modules/loganalytics.bicep' = {
  name: 'logAnalytics'
  scope: rg
  params: {
    name: 'log${resourceToken}'
    location: location
    tags: tags
  }
}

// Container Apps Environment
module containerAppEnvironment 'modules/environment.bicep' = {
  name: 'containerAppEnvironment'
  scope: rg
  params: {
    name: 'cae${resourceToken}'
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
    tags: tags
  }
}

// Container App
module containerApp 'modules/containerapp.bicep' = {
  name: 'containerApp'
  scope: rg
  params: {
    name: nameToken
    location: location
    environmentId: containerAppEnvironment.outputs.id
    containerImage: containerRegistryEndpoint != '' ? containerRegistryEndpoint : '${containerRegistry.outputs.loginServer}/fetscash:latest'
    acrLoginServer: acrLoginServerOverride != '' ? acrLoginServerOverride : containerRegistry.outputs.loginServer
    acrUsername: acrUsernameOverride != '' ? acrUsernameOverride : containerRegistry.outputs.username
    acrPassword: acrPasswordOverride != '' ? acrPasswordOverride : containerRegistry.outputs.password
    buildArgs: {
      VITE_SUPABASE_URL: supabaseUrl
      VITE_SUPABASE_ANON_KEY: supabaseAnonKey
    }
    targetPort: 80
    cpu: '0.5'
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 3
    tags: tags
  }
}

// Outputs
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_SUBSCRIPTION_ID string = subscription().subscriptionId
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_ENVIRONMENT_ID string = containerAppEnvironment.outputs.id
output SERVICE_WEB_NAME string = containerApp.outputs.name
output SERVICE_WEB_ENDPOINTS string = containerApp.outputs.fqdn
output SERVICE_WEB_IMAGE_NAME string = containerApp.outputs.imageName
