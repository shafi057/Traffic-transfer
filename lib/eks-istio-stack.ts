import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { KubectlV28Layer } from '@aws-cdk/lambda-layer-kubectl-v28';

export class EksIstioStack extends Stack {
  constructor(scope: cdk.App, id: string, props?: StackProps) {
    super(scope, id, props);

    // IAM Role for EKS Admin
    const adminRole = new iam.Role(this, 'EksAdminRole', {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'));
    adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'));
    adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSServicePolicy'));
    adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));


    // Add KubectlLayer for CDK Lambda-backed kubectl
    const kubectlLayer = new KubectlV28Layer(this, 'KubectlLayer');

    // Create EKS Cluster
    const cluster = new eks.Cluster(this, 'EksCluster', {
      version: eks.KubernetesVersion.V1_28,
      defaultCapacity: 2,
      mastersRole: adminRole,
      kubectlLayer: kubectlLayer,
    });

    // Create Istio namespace
    const istioNamespace = cluster.addManifest('IstioNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'istio-system' },
    });

    // Install Istio components
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

    // Set Istio chart deployment order
    istioBase.node.addDependency(istioNamespace);
    istiod.node.addDependency(istioBase);
    istioIngress.node.addDependency(istiod);

    // Load all manifests from the 'manifests' folder
    const manifestsPath = path.join(__dirname, '..', 'manifests');

    const loadManifest = (filename: string) => {
      const fullPath = path.join(manifestsPath, filename);
      return yaml.loadAll(fs.readFileSync(fullPath, 'utf8')) as Record<string, any>[];
    };

    const namespaceManifest = loadManifest('namespace.yaml');
    const demoV1Manifest = loadManifest('demo-v1.yaml');
    const demoV2Manifest = loadManifest('demo-v2.yaml');
    const destinationRuleManifest = loadManifest('destination-rule.yaml');
    const virtualServiceManifest = loadManifest('virtual-service.yaml');
    const gatewayManifest = loadManifest('gateway.yaml');

    // Deploy 'demo' namespace from YAML
    const demoNamespace = cluster.addManifest('DemoNamespace', ...namespaceManifest);

    // Deploy app versions
    const demoAppV1 = cluster.addManifest('DemoAppV1', ...demoV1Manifest);
    const demoAppV2 = cluster.addManifest('DemoAppV2', ...demoV2Manifest);

    // Set app dependencies on namespace
    demoAppV1.node.addDependency(demoNamespace);
    demoAppV2.node.addDependency(demoNamespace);

    // Deploy traffic control manifests
    const destinationRule = cluster.addManifest('DestinationRule', ...destinationRuleManifest);
    const virtualService = cluster.addManifest('VirtualService', ...virtualServiceManifest);
    const gateway = cluster.addManifest('Gateway', ...gatewayManifest);

    // Ensure traffic configs deploy after app versions
    destinationRule.node.addDependency(demoAppV1);
    destinationRule.node.addDependency(demoAppV2);
    virtualService.node.addDependency(demoAppV1);
    virtualService.node.addDependency(demoAppV2);
    gateway.node.addDependency(demoAppV1);
    gateway.node.addDependency(demoAppV2);
  }
}
