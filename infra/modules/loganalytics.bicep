metadata description = 'Creates a Log Analytics workspace for container app monitoring'

@description('Name of the Log Analytics workspace')
param name string

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Tags to apply to resources')
param tags object = {}

@description('Retention period in days')
param retentionInDays int = 30

@description('SKU for the workspace')
param sku string = 'PerGB2018'

// Log Analytics Workspace resource
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      name: sku
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Outputs
output id string = logAnalyticsWorkspace.id
output name string = logAnalyticsWorkspace.name
output customerId string = logAnalyticsWorkspace.properties.customerId
@secure()
output primarySharedKey string = logAnalyticsWorkspace.listKeys().primarySharedKey
