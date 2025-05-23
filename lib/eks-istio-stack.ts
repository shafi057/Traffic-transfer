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
      clusterName:'EksCluster',
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

    const manifestsDir = path.join(__dirname, '..', 'manifests');
    const istioDir = path.join(manifestsDir, 'istio');

    const istioFiles = [
      'istio-base.yaml',    
      'istiod.yaml',        
      'istio-ingress.yaml'  
    ];

    const appFiles = [
      'destination-rule.yaml',
      'virtual-service.yaml',
      'gateway.yaml',
      'demo-v1.yaml',
      'demo-v2.yaml'
    ];

    const loadResources = (dir: string, files: string[]) =>
      files.flatMap(file =>
        yaml
          .parseAllDocuments(fs.readFileSync(path.join(dir, file), 'utf-8'))
          .map((doc: any) => doc.toJSON())
          .filter(Boolean)
      );

    const istioResources = loadResources(istioDir, istioFiles);
    const appResources = loadResources(manifestsDir, appFiles);

    const allIstio = cluster.addManifest('IstioResources', ...istioResources);
    allIstio.node.addDependency(istioNamespace);

    const allApp = cluster.addManifest('AppResources', ...appResources);
    allApp.node.addDependency(allIstio);
    allApp.node.addDependency(demoNamespace);
  }
}
