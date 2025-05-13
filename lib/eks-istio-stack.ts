import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { KubectlV28Layer } from '@aws-cdk/lambda-layer-kubectl-v28'; // ✅ Import added

export class EksIstioStack extends Stack {
  constructor(scope: cdk.App, id: string, props?: StackProps) {
    super(scope, id, props);

    // IAM Role for EKS Admin
    const adminRole = new iam.Role(this, 'EksAdminRole', {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'));
    adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'));

    // Add KubectlLayer required for CDK's Lambda-backed kubectl
    const kubectlLayer = new KubectlV28Layer(this, 'KubectlLayer');

    // Create EKS Cluster with kubectlLayer
    const cluster = new eks.Cluster(this, 'EksCluster', {
      version: eks.KubernetesVersion.V1_28,
      defaultCapacity: 2,
      mastersRole: adminRole,
      kubectlLayer: kubectlLayer, // ✅ Required in CDK v2
    });

    // Create Istio namespace
    const istioNamespace = cluster.addManifest('IstioNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'istio-system' },
    });

    // Install Istio components using Helm charts
    const istioBase = cluster.addHelmChart('IstioBase', {
      chart: 'base',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      release: 'istio-base',
      namespace: 'istio-system',
    });

    const istiod = cluster.addHelmChart('Istiod', {
      chart: 'istiod',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      release: 'istiod',
      namespace: 'istio-system',
      values: {
        global: {
          istioNamespace: 'istio-system',
        },
      },
    });

    const istioIngress = cluster.addHelmChart('IstioIngress', {
      chart: 'gateway',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      release: 'istio-ingress',
      namespace: 'istio-system',
    });

    // Ensure correct deployment order for Istio charts
    istioBase.node.addDependency(istioNamespace);
    istiod.node.addDependency(istioBase);
    istioIngress.node.addDependency(istiod);

    // Load and apply all YAML files from the same 'manifests' folder
    const manifestsFolderPath = path.join(__dirname, '..', 'manifests');

    const demoV1Path = path.join(manifestsFolderPath, 'demo-v1.yaml');
    const demoV2Path = path.join(manifestsFolderPath, 'demo-v2.yaml');
    const destinationRulePath = path.join(manifestsFolderPath, 'destination-rule.yaml');
    const virtualServicePath = path.join(manifestsFolderPath, 'virtual-service.yaml');
    const namespacePath = path.join(manifestsFolderPath, 'namespace.yaml');
    const gatewayPath = path.join(manifestsFolderPath, 'gateway.yaml');

    // Load each YAML file
    const demoV1Manifest = yaml.loadAll(fs.readFileSync(demoV1Path, 'utf8')) as Record<string, any>[];
    const demoV2Manifest = yaml.loadAll(fs.readFileSync(demoV2Path, 'utf8')) as Record<string, any>[];
    const destinationRuleManifest = yaml.loadAll(fs.readFileSync(destinationRulePath, 'utf8')) as Record<string, any>[];
    const virtualServiceManifest = yaml.loadAll(fs.readFileSync(virtualServicePath, 'utf8')) as Record<string, any>[];
    const namespaceManifest = yaml.loadAll(fs.readFileSync(namespacePath, 'utf8')) as Record<string, any>[];
    const gatewayManifest = yaml.loadAll(fs.readFileSync(gatewayPath, 'utf8')) as Record<string, any>[];

    // Deploy application version 1 (demo-v1.yaml)
    const demoAppV1 = cluster.addManifest('DemoAppV1', ...demoV1Manifest);

    // Deploy application version 2 (demo-v2.yaml)
    const demoAppV2 = cluster.addManifest('DemoAppV2', ...demoV2Manifest);

    // Deploy Istio routing and other traffic configurations
    const destinationRule = cluster.addManifest('DestinationRule', ...destinationRuleManifest);
    const virtualService = cluster.addManifest('VirtualService', ...virtualServiceManifest);
    const namespace = cluster.addManifest('Namespace', ...namespaceManifest);
    const gateway = cluster.addManifest('Gateway', ...gatewayManifest);

    // Ensure traffic routing resources are deployed after app versions
    destinationRule.node.addDependency(demoAppV1);
    destinationRule.node.addDependency(demoAppV2);
    virtualService.node.addDependency(demoAppV1);
    virtualService.node.addDependency(demoAppV2);
    namespace.node.addDependency(demoAppV1);
    namespace.node.addDependency(demoAppV2);
    gateway.node.addDependency(demoAppV1);
    gateway.node.addDependency(demoAppV2);
  }
}
