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
            remoteAccess: { sshKeyName: 'demonamespaceistio' },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyx5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLDZCQUE2QjtBQUM3QixnRkFBb0U7QUFFcEUsTUFBYSxhQUFjLFNBQVEsbUJBQUs7SUFDdEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQ3hCLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsd0JBQXdCLENBQUMsQ0FDckUsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsV0FBVyxFQUFFLFlBQVk7WUFDekIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVk7U0FDYixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQzFELFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBRTtTQUNuRCxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUM3QixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDhCQUE4QixDQUFDLENBQzNFLENBQUM7UUFFRixPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFO1lBQzdDLFFBQVEsRUFBRSxtQ0FBbUM7WUFDN0MsTUFBTSxFQUFFLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDO1NBQ25FLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0QsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRTtTQUNuQyxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRTtZQUN6RCxVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUUsV0FBVztZQUNqQixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1NBQzNCLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFO1lBQ2xELEtBQUssRUFBRSxNQUFNO1lBQ2IsT0FBTyxFQUFFLFlBQVk7WUFDckIsVUFBVSxFQUFFLHFEQUFxRDtZQUNqRSxTQUFTLEVBQUUsY0FBYztZQUN6QixlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDLENBQUM7UUFFSCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRTtZQUM1QyxLQUFLLEVBQUUsUUFBUTtZQUNmLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLFVBQVUsRUFBRSxxREFBcUQ7WUFDakUsU0FBUyxFQUFFLGNBQWM7U0FDMUIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFckMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsRUFBRTtZQUNqRSxLQUFLLEVBQUUsU0FBUztZQUNoQixPQUFPLEVBQUUsZUFBZTtZQUN4QixVQUFVLEVBQUUscURBQXFEO1lBQ2pFLFNBQVMsRUFBRSxjQUFjO1lBQ3pCLE1BQU0sRUFBRTtnQkFDTixPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLGNBQWM7aUJBQ3JCO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFDSCxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUxQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDN0QsTUFBTSxRQUFRLEdBQUc7WUFDZix1QkFBdUI7WUFDdkIsc0JBQXNCO1lBQ3RCLGNBQWM7WUFDZCxjQUFjO1lBQ2QsY0FBYztTQUNmLENBQUM7UUFFRixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFlLEVBQUUsRUFBRSxDQUNyRCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ25CLElBQUk7YUFDRCxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQ2pFLEdBQUcsQ0FBQyxDQUFDLEdBQVEsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQy9CLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FDbkIsQ0FBQztRQUVKLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUNwRSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBQ0Y7QUFyR0Qsc0NBcUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVrcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgeWFtbCBmcm9tICd5YW1sJztcclxuaW1wb3J0IHsgS3ViZWN0bFYyOExheWVyIH0gZnJvbSAnQGF3cy1jZGsvbGFtYmRhLWxheWVyLWt1YmVjdGwtdjI4JztcclxuXHJcbmV4cG9ydCBjbGFzcyBFa3NJc3Rpb1N0YWNrIGV4dGVuZHMgU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IGFkbWluUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRWtzQWRtaW5Sb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQWNjb3VudFJvb3RQcmluY2lwYWwoKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFkbWluUm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxyXG4gICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU0NsdXN0ZXJQb2xpY3knKVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBrdWJlY3RsTGF5ZXIgPSBuZXcgS3ViZWN0bFYyOExheWVyKHRoaXMsICdLdWJlY3RsTGF5ZXInKTtcclxuXHJcbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVrcy5DbHVzdGVyKHRoaXMsICdFa3NDbHVzdGVyJywge1xyXG4gICAgICBjbHVzdGVyTmFtZTogJ0Vrc0NsdXN0ZXInLFxyXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjgsXHJcbiAgICAgIGRlZmF1bHRDYXBhY2l0eTogMCxcclxuICAgICAgbWFzdGVyc1JvbGU6IGFkbWluUm9sZSxcclxuICAgICAga3ViZWN0bExheWVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgbm9kZWdyb3VwID0gY2x1c3Rlci5hZGROb2RlZ3JvdXBDYXBhY2l0eSgnTm9kZUdyb3VwJywge1xyXG4gICAgICBkZXNpcmVkU2l6ZTogMixcclxuICAgICAgaW5zdGFuY2VUeXBlczogW25ldyBlYzIuSW5zdGFuY2VUeXBlKCd0My5tZWRpdW0nKV0sXHJcbiAgICAgIHJlbW90ZUFjY2VzczogeyBzc2hLZXlOYW1lOiAnZGVtb25hbWVzcGFjZWlzdGlvJyB9LCBcclxuICAgIH0pO1xyXG5cclxuICAgIG5vZGVncm91cC5yb2xlLmFkZE1hbmFnZWRQb2xpY3koXHJcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZScpXHJcbiAgICApO1xyXG5cclxuICAgIGNsdXN0ZXIuYXdzQXV0aC5hZGRSb2xlTWFwcGluZyhub2RlZ3JvdXAucm9sZSwge1xyXG4gICAgICB1c2VybmFtZTogJ3N5c3RlbTpub2RlOnt7RUMyUHJpdmF0ZUROU05hbWV9fScsXHJcbiAgICAgIGdyb3VwczogWydzeXN0ZW06Ym9vdHN0cmFwcGVycycsICdzeXN0ZW06bm9kZXMnLCAnc3lzdGVtOm1hc3RlcnMnXSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzdGlvTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnSXN0aW9OYW1lc3BhY2UnLCB7XHJcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXHJcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxyXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnaXN0aW8tc3lzdGVtJyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZGVtb05hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9OYW1lc3BhY2UnLCB7XHJcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXHJcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxyXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnZGVtbycgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzdGlvQmFzZSA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0Jhc2UnLCB7XHJcbiAgICAgIGNoYXJ0OiAnYmFzZScsXHJcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1iYXNlJyxcclxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXHJcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXHJcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzdGlvZCA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb2QnLCB7XHJcbiAgICAgIGNoYXJ0OiAnaXN0aW9kJyxcclxuICAgICAgcmVsZWFzZTogJ2lzdGlvZCcsXHJcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxyXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxyXG4gICAgfSk7XHJcbiAgICBpc3Rpb2Qubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvQmFzZSk7XHJcblxyXG4gICAgY29uc3QgaW5ncmVzc0dhdGV3YXkgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9JbmdyZXNzR2F0ZXdheScsIHtcclxuICAgICAgY2hhcnQ6ICdnYXRld2F5JyxcclxuICAgICAgcmVsZWFzZTogJ2lzdGlvLWluZ3Jlc3MnLFxyXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcclxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcclxuICAgICAgdmFsdWVzOiB7XHJcbiAgICAgICAgc2VydmljZToge1xyXG4gICAgICAgICAgdHlwZTogJ0xvYWRCYWxhbmNlcicsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgaW5ncmVzc0dhdGV3YXkubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvZCk7XHJcblxyXG4gICAgY29uc3QgbWFuaWZlc3RzRGlyID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ21hbmlmZXN0cycpO1xyXG4gICAgY29uc3QgYXBwRmlsZXMgPSBbXHJcbiAgICAgICdkZXN0aW5hdGlvbi1ydWxlLnlhbWwnLFxyXG4gICAgICAndmlydHVhbC1zZXJ2aWNlLnlhbWwnLFxyXG4gICAgICAnZ2F0ZXdheS55YW1sJyxcclxuICAgICAgJ2RlbW8tdjEueWFtbCcsXHJcbiAgICAgICdkZW1vLXYyLnlhbWwnLFxyXG4gICAgXTtcclxuXHJcbiAgICBjb25zdCBsb2FkUmVzb3VyY2VzID0gKGRpcjogc3RyaW5nLCBmaWxlczogc3RyaW5nW10pID0+XHJcbiAgICAgIGZpbGVzLmZsYXRNYXAoZmlsZSA9PlxyXG4gICAgICAgIHlhbWxcclxuICAgICAgICAgIC5wYXJzZUFsbERvY3VtZW50cyhmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKGRpciwgZmlsZSksICd1dGYtOCcpKVxyXG4gICAgICAgICAgLm1hcCgoZG9jOiBhbnkpID0+IGRvYy50b0pTT04oKSlcclxuICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcclxuICAgICAgKTtcclxuXHJcbiAgICBjb25zdCBhcHBSZXNvdXJjZXMgPSBsb2FkUmVzb3VyY2VzKG1hbmlmZXN0c0RpciwgYXBwRmlsZXMpO1xyXG4gICAgY29uc3QgYWxsQXBwID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnQXBwUmVzb3VyY2VzJywgLi4uYXBwUmVzb3VyY2VzKTtcclxuICAgIGFsbEFwcC5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9OYW1lc3BhY2UpO1xyXG4gICAgYWxsQXBwLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vTmFtZXNwYWNlKTtcclxuICAgIGFsbEFwcC5ub2RlLmFkZERlcGVuZGVuY3koaW5ncmVzc0dhdGV3YXkpO1xyXG4gIH1cclxufVxyXG4iXX0=