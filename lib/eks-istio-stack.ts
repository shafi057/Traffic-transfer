import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { KubectlV28Layer } from '@aws-cdk/lambda-layer-kubectl-v28';

export class EksIstioStack extends Stack {
constructor(scope: cdk.App, id: string, props?: StackProps) {
super(scope, id, props);

const adminRole = new iam.Role(this, 'EksAdminRole', {
  assumedBy: new iam.AccountRootPrincipal(),
});

adminRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy')
);

const kubectlLayer = new KubectlV28Layer(this, 'KubectlLayer');

const cluster = new eks.Cluster(this, 'EksCluster', {
  version: eks.KubernetesVersion.V1_28,
  defaultCapacity: 0,
  mastersRole: adminRole,
  kubectlLayer,
});

const nodegroup = cluster.addNodegroupCapacity('NodeGroup', {
  desiredSize: 2,
  instanceTypes: [new ec2.InstanceType('t3.medium')],
  remoteAccess: { sshKeyName: 'demo' },
});

nodegroup.role.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
);

cluster.awsAuth.addRoleMapping(nodegroup.role, {
  username: 'system:node:{{EC2PrivateDNSName}}',
  groups: ['system:bootstrappers', 'system:nodes', 'system:masters'],
});

// Create required namespaces inline
const istioNamespace = cluster.addManifest('IstioNamespace', {
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name: 'istio-system' },
});

const demoNamespace = cluster.addManifest('DemoNamespace', {
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name: 'demo' },
});

// Manifest loader (your exact block)
const manifestsDir = path.join(__dirname, '..', 'manifests');
const istioDir = path.join(manifestsDir, 'istio');

const istioFiles = [
  'istio-base.yaml',
  'istio-ingress.yaml',
  'istiod.yaml'
];

const appFiles = [
  'demo-v1.yaml',
  'demo-v2.yaml',
  'destination-rule.yaml',
  'gateway.yaml',
  'virtual-service.yaml'
];

const loadResources = (dir: string, files: string[]) =>
  files.flatMap(file =>
    yaml
      .parseAllDocuments(fs.readFileSync(path.join(dir, file), 'utf-8'))
      .map((doc: any) => doc.toJSON())
      .filter(Boolean)
  );

const resources = [
  ...loadResources(manifestsDir, appFiles),
  ...loadResources(istioDir, istioFiles)
];

const appManifests = cluster.addManifest('AppManifests', ...resources);
appManifests.node.addDependency(demoNamespace);
appManifests.node.addDependency(istioNamespace);
}
}