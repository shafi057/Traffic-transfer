"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EksIstioStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const eks = require("aws-cdk-lib/aws-eks");
const iam = require("aws-cdk-lib/aws-iam");
const ec2 = require("aws-cdk-lib/aws-ec2");
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");
const lambda_layer_kubectl_v28_1 = require("@aws-cdk/lambda-layer-kubectl-v28");
class EksIstioStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const adminRole = new iam.Role(this, 'EksAdminRole', {
            assumedBy: new iam.AccountRootPrincipal(),
        });
        adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'));
        const kubectlLayer = new lambda_layer_kubectl_v28_1.KubectlV28Layer(this, 'KubectlLayer');
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
        nodegroup.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
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
        const loadResources = (dir, files) => files.flatMap(file => yaml
            .parseAllDocuments(fs.readFileSync(path.join(dir, file), 'utf-8'))
            .map((doc) => doc.toJSON())
            .filter(Boolean));
        const appResources = loadResources(manifestsDir, appFiles);
        const allApp = cluster.addManifest('AppResources', ...appResources);
        allApp.node.addDependency(istioNamespace);
        allApp.node.addDependency(demoNamespace);
        allApp.node.addDependency(ingressGateway);
    }
}
exports.EksIstioStack = EksIstioStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyx5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLDZCQUE2QjtBQUM3QixnRkFBb0U7QUFFcEUsTUFBYSxhQUFjLFNBQVEsbUJBQUs7SUFDdEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQ3hCLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsd0JBQXdCLENBQUMsQ0FDckUsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsV0FBVyxFQUFFLFlBQVk7WUFDekIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVk7U0FDYixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQzFELFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUMsSUFBSSxH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LE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNGO0FBdEdELHNDQXNHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVrcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ3lhbWwnO1xuaW1wb3J0IHsgS3ViZWN0bFYyOExheWVyIH0gZnJvbSAnQGF3cy1jZGsvbGFtYmRhLWxheWVyLWt1YmVjdGwtdjI4JztcblxuZXhwb3J0IGNsYXNzIEVrc0lzdGlvU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGFkbWluUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRWtzQWRtaW5Sb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkFjY291bnRSb290UHJpbmNpcGFsKCksXG4gICAgfSk7XG5cbiAgICBhZG1pblJvbGUuYWRkTWFuYWdlZFBvbGljeShcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTQ2x1c3RlclBvbGljeScpXG4gICAgKTtcblxuICAgIGNvbnN0IGt1YmVjdGxMYXllciA9IG5ldyBLdWJlY3RsVjI4TGF5ZXIodGhpcywgJ0t1YmVjdGxMYXllcicpO1xuXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnRWtzQ2x1c3RlcicsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiAnRWtzQ2x1c3RlcicsXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjgsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsXG4gICAgICBtYXN0ZXJzUm9sZTogYWRtaW5Sb2xlLFxuICAgICAga3ViZWN0bExheWVyLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgbm9kZWdyb3VwID0gY2x1c3Rlci5hZGROb2RlZ3JvdXBDYXBhY2l0eSgnTm9kZUdyb3VwJywge1xuICAgICAgZGVzaXJlZFNpemU6IDIsXG4gICAgICBpbnN0YW5jZVR5cGVzOiBbbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ3QzLm1lZGl1bScpXSxcbiAgICAgIHJlbW90ZUFjY2VzczogeyBzc2hLZXlOYW1lOiAnZGVtbycgfSwgXG4gICAgfSk7XG5cbiAgICBub2RlZ3JvdXAucm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25TU01NYW5hZ2VkSW5zdGFuY2VDb3JlJylcbiAgICApO1xuXG4gICAgY2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKG5vZGVncm91cC5yb2xlLCB7XG4gICAgICB1c2VybmFtZTogJ3N5c3RlbTpub2RlOnt7RUMyUHJpdmF0ZUROU05hbWV9fScsXG4gICAgICBncm91cHM6IFsnc3lzdGVtOmJvb3RzdHJhcHBlcnMnLCAnc3lzdGVtOm5vZGVzJywgJ3N5c3RlbTptYXN0ZXJzJ10sXG4gICAgfSk7XG5cbiAgICBjb25zdCBpc3Rpb05hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0lzdGlvTmFtZXNwYWNlJywge1xuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ2lzdGlvLXN5c3RlbScgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlbW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vTmFtZXNwYWNlJywge1xuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ2RlbW8nIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBpc3Rpb0Jhc2UgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9CYXNlJywge1xuICAgICAgY2hhcnQ6ICdiYXNlJyxcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1iYXNlJyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlzdGlvZCA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb2QnLCB7XG4gICAgICBjaGFydDogJ2lzdGlvZCcsXG4gICAgICByZWxlYXNlOiAnaXN0aW9kJyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcbiAgICB9KTtcbiAgICBpc3Rpb2Qubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvQmFzZSk7XG5cbiAgICBjb25zdCBpbmdyZXNzR2F0ZXdheSA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0luZ3Jlc3NHYXRld2F5Jywge1xuICAgICAgY2hhcnQ6ICdnYXRld2F5JyxcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1pbmdyZXNzJyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcbiAgICAgIHZhbHVlczoge1xuICAgICAgICBzZXJ2aWNlOiB7XG4gICAgICAgICAgdHlwZTogJ0xvYWRCYWxhbmNlcicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGluZ3Jlc3NHYXRld2F5Lm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb2QpO1xuXG4gICAgY29uc3QgbWFuaWZlc3RzRGlyID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ21hbmlmZXN0cycpO1xuICAgIGNvbnN0IGFwcEZpbGVzID0gW1xuICAgICAgJ2Rlc3RpbmF0aW9uLXJ1bGUueWFtbCcsXG4gICAgICAndmlydHVhbC1zZXJ2aWNlLnlhbWwnLFxuICAgICAgJ2dhdGV3YXkueWFtbCcsXG4gICAgICAnZGVtby12MS55YW1sJyxcbiAgICAgICdkZW1vLXYyLnlhbWwnLFxuICAgIF07XG5cbiAgICBjb25zdCBsb2FkUmVzb3VyY2VzID0gKGRpcjogc3RyaW5nLCBmaWxlczogc3RyaW5nW10pID0+XG4gICAgICBmaWxlcy5mbGF0TWFwKGZpbGUgPT5cbiAgICAgICAgeWFtbFxuICAgICAgICAgIC5wYXJzZUFsbERvY3VtZW50cyhmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKGRpciwgZmlsZSksICd1dGYtOCcpKVxuICAgICAgICAgIC5tYXAoKGRvYzogYW55KSA9PiBkb2MudG9KU09OKCkpXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgKTtcblxuICAgIGNvbnN0IGFwcFJlc291cmNlcyA9IGxvYWRSZXNvdXJjZXMobWFuaWZlc3RzRGlyLCBhcHBGaWxlcyk7XG5cbiAgICBjb25zdCBhbGxBcHAgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdBcHBSZXNvdXJjZXMnLCAuLi5hcHBSZXNvdXJjZXMpO1xuICAgIGFsbEFwcC5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9OYW1lc3BhY2UpO1xuICAgIGFsbEFwcC5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XG4gICAgYWxsQXBwLm5vZGUuYWRkRGVwZW5kZW5jeShpbmdyZXNzR2F0ZXdheSk7XG4gIH1cbn1cbiJdfQ==