metadata description = 'Creates a Container App for the web application'

@description('Name of the Container App')
param name string

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Container Apps Environment ID')
param environmentId string

@description('Container image to deploy')
param containerImage string = 'nginx:latest'

@description('Build arguments for Docker build')
param buildArgs object = {}

@description('Target port for the container')
param targetPort int = 80

@description('Container CPU allocation')
param cpu string = '0.5'

@description('Container memory allocation')
param memory string = '1Gi'

@description('Minimum number of replicas (0 = scale to zero for cost savings)')
param minReplicas int = 0

@description('Maximum number of replicas')
param maxReplicas int = 3

@description('Tags to apply to resources')
param tags object = {}

@description('Enable external ingress (public access)')
param external bool = true

// Convert buildArgs to environment variables for the container
var environmentVariables = [for item in items(buildArgs): {
  name: item.key
  value: string(item.value)
}]

// Container App resource
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: external
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
      }
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: name
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: environmentVariables
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output id string = containerApp.id
output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output imageName string = containerImage
output principalId string = containerApp.identity.principalId
