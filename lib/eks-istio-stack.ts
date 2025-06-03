import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as fs from 'fs';
import * as path from 'path';
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
      clusterName: 'EksCluster',
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

    const istioBase = cluster.addHelmChart('IstioBase', {
      chart: 'base',
      release: 'istio-base',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      namespace: 'istio-system',
      createNamespace: true,
    });

    const istiod = cluster.addHelmChart('Istiod', {
      chart: 'istiod',
      release: 'istiod',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      namespace: 'istio-system',
    });
    istiod.node.addDependency(istioBase);

    const ingressGateway = cluster.addHelmChart('IstioIngressGateway', {
      chart: 'gateway',
      release: 'istio-ingress',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      namespace: 'istio-system',
      values: {
        service: {
          type: 'LoadBalancer',
        },
      },
    });
    ingressGateway.node.addDependency(istiod);

    const manifestsDir = path.join(__dirname, '..', 'manifests');
    const appFiles = [
      'destination-rule.yaml',
      'virtual-service.yaml',
      'gateway.yaml',
      'demo-v1.yaml',
      'demo-v2.yaml',
    ];

    const loadResources = (dir: string, files: string[]) =>
      files.flatMap(file =>
        yaml
          .parseAllDocuments(fs.readFileSync(path.join(dir, file), 'utf-8'))
          .map((doc: any) => doc.toJSON())
          .filter(Boolean)
      );

    const appResources = loadResources(manifestsDir, appFiles);
    const allApp = cluster.addManifest('AppResources', ...appResources);
    allApp.node.addDependency(istioNamespace);
    allApp.node.addDependency(demoNamespace);
    allApp.node.addDependency(ingressGateway);
  }
}
