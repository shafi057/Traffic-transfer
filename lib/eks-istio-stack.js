"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EksIstioStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const eks = require("aws-cdk-lib/aws-eks");
const iam = require("aws-cdk-lib/aws-iam");
const ec2 = require("aws-cdk-lib/aws-ec2");
const path = require("path");
const fs = require("fs");
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
        const loadResources = (dir, files) => files.flatMap(file => yaml
            .parseAllDocuments(fs.readFileSync(path.join(dir, file), 'utf-8'))
            .map((doc) => doc.toJSON())
            .filter(Boolean));
        const istioResources = loadResources(istioDir, istioFiles);
        const appResources = loadResources(manifestsDir, appFiles);
        const allIstio = cluster.addManifest('IstioResources', ...istioResources);
        allIstio.node.addDependency(istioNamespace);
        const allApp = cluster.addManifest('AppResources', ...appResources);
        allApp.node.addDependency(allIstio);
        allApp.node.addDependency(demoNamespace);
    }
}
exports.EksIstioStack = EksIstioStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QixnRkFBb0U7QUFFcEUsTUFBYSxhQUFjLFNBQVEsbUJBQUs7SUFDdEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQ3hCLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsd0JBQXdCLENBQUMsQ0FDckUsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsV0FBVyxFQUFDLFlBQVk7WUFDeEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVk7U0FDYixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQzFELFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUU7U0FDckMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDN0IsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUMzRSxDQUFDO1FBRUYsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRTtZQUM3QyxRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLE1BQU0sRUFBRSxDQUFDLHNCQUFzQixFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQztTQUNuRSxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFO1lBQzNELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUU7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUU7WUFDekQsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtTQUMzQixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDN0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEQsTUFBTSxVQUFVLEdBQUc7WUFDakIsaUJBQWlCO1lBQ2pCLGFBQWE7WUFDYixvQkFBb0I7U0FDckIsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHO1lBQ2YsdUJBQXVCO1lBQ3ZCLHNCQUFzQjtZQUN0QixjQUFjO1lBQ2QsY0FBYztZQUNkLGNBQWM7U0FDZixDQUFDO1FBRUYsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBZSxFQUFFLEVBQUUsQ0FDckQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNuQixJQUFJO2FBQ0QsaUJBQWlCLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUNqRSxHQUFHLENBQUMsQ0FBQyxHQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUMvQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQ25CLENBQUM7UUFFSixNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFM0QsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRTVDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDM0MsQ0FBQztDQUNGO0FBcEZELHNDQW9GQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVrcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ3lhbWwnO1xuaW1wb3J0IHsgS3ViZWN0bFYyOExheWVyIH0gZnJvbSAnQGF3cy1jZGsvbGFtYmRhLWxheWVyLWt1YmVjdGwtdjI4JztcblxuZXhwb3J0IGNsYXNzIEVrc0lzdGlvU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGFkbWluUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRWtzQWRtaW5Sb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkFjY291bnRSb290UHJpbmNpcGFsKCksXG4gICAgfSk7XG5cbiAgICBhZG1pblJvbGUuYWRkTWFuYWdlZFBvbGljeShcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTQ2x1c3RlclBvbGljeScpXG4gICAgKTtcblxuICAgIGNvbnN0IGt1YmVjdGxMYXllciA9IG5ldyBLdWJlY3RsVjI4TGF5ZXIodGhpcywgJ0t1YmVjdGxMYXllcicpO1xuXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnRWtzQ2x1c3RlcicsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOidFa3NDbHVzdGVyJyxcbiAgICAgIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8yOCxcbiAgICAgIGRlZmF1bHRDYXBhY2l0eTogMCxcbiAgICAgIG1hc3RlcnNSb2xlOiBhZG1pblJvbGUsXG4gICAgICBrdWJlY3RsTGF5ZXIsXG4gICAgfSk7XG5cbiAgICBjb25zdCBub2RlZ3JvdXAgPSBjbHVzdGVyLmFkZE5vZGVncm91cENhcGFjaXR5KCdOb2RlR3JvdXAnLCB7XG4gICAgICBkZXNpcmVkU2l6ZTogMixcbiAgICAgIGluc3RhbmNlVHlwZXM6IFtuZXcgZWMyLkluc3RhbmNlVHlwZSgndDMubWVkaXVtJyldLFxuICAgICAgcmVtb3RlQWNjZXNzOiB7IHNzaEtleU5hbWU6ICdkZW1vJyB9LFxuICAgIH0pO1xuXG4gICAgbm9kZWdyb3VwLnJvbGUuYWRkTWFuYWdlZFBvbGljeShcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZScpXG4gICAgKTtcblxuICAgIGNsdXN0ZXIuYXdzQXV0aC5hZGRSb2xlTWFwcGluZyhub2RlZ3JvdXAucm9sZSwge1xuICAgICAgdXNlcm5hbWU6ICdzeXN0ZW06bm9kZTp7e0VDMlByaXZhdGVETlNOYW1lfX0nLFxuICAgICAgZ3JvdXBzOiBbJ3N5c3RlbTpib290c3RyYXBwZXJzJywgJ3N5c3RlbTpub2RlcycsICdzeXN0ZW06bWFzdGVycyddLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaXN0aW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdJc3Rpb05hbWVzcGFjZScsIHtcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdpc3Rpby1zeXN0ZW0nIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBkZW1vTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb05hbWVzcGFjZScsIHtcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdkZW1vJyB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgbWFuaWZlc3RzRGlyID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ21hbmlmZXN0cycpO1xuICAgIGNvbnN0IGlzdGlvRGlyID0gcGF0aC5qb2luKG1hbmlmZXN0c0RpciwgJ2lzdGlvJyk7XG5cbiAgICBjb25zdCBpc3Rpb0ZpbGVzID0gW1xuICAgICAgJ2lzdGlvLWJhc2UueWFtbCcsICAgIFxuICAgICAgJ2lzdGlvZC55YW1sJywgICAgICAgIFxuICAgICAgJ2lzdGlvLWluZ3Jlc3MueWFtbCcgIFxuICAgIF07XG5cbiAgICBjb25zdCBhcHBGaWxlcyA9IFtcbiAgICAgICdkZXN0aW5hdGlvbi1ydWxlLnlhbWwnLFxuICAgICAgJ3ZpcnR1YWwtc2VydmljZS55YW1sJyxcbiAgICAgICdnYXRld2F5LnlhbWwnLFxuICAgICAgJ2RlbW8tdjEueWFtbCcsXG4gICAgICAnZGVtby12Mi55YW1sJ1xuICAgIF07XG5cbiAgICBjb25zdCBsb2FkUmVzb3VyY2VzID0gKGRpcjogc3RyaW5nLCBmaWxlczogc3RyaW5nW10pID0+XG4gICAgICBmaWxlcy5mbGF0TWFwKGZpbGUgPT5cbiAgICAgICAgeWFtbFxuICAgICAgICAgIC5wYXJzZUFsbERvY3VtZW50cyhmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKGRpciwgZmlsZSksICd1dGYtOCcpKVxuICAgICAgICAgIC5tYXAoKGRvYzogYW55KSA9PiBkb2MudG9KU09OKCkpXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgKTtcblxuICAgIGNvbnN0IGlzdGlvUmVzb3VyY2VzID0gbG9hZFJlc291cmNlcyhpc3Rpb0RpciwgaXN0aW9GaWxlcyk7XG4gICAgY29uc3QgYXBwUmVzb3VyY2VzID0gbG9hZFJlc291cmNlcyhtYW5pZmVzdHNEaXIsIGFwcEZpbGVzKTtcblxuICAgIGNvbnN0IGFsbElzdGlvID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnSXN0aW9SZXNvdXJjZXMnLCAuLi5pc3Rpb1Jlc291cmNlcyk7XG4gICAgYWxsSXN0aW8ubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvTmFtZXNwYWNlKTtcblxuICAgIGNvbnN0IGFsbEFwcCA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0FwcFJlc291cmNlcycsIC4uLmFwcFJlc291cmNlcyk7XG4gICAgYWxsQXBwLm5vZGUuYWRkRGVwZW5kZW5jeShhbGxJc3Rpbyk7XG4gICAgYWxsQXBwLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vTmFtZXNwYWNlKTtcbiAgfVxufVxuIl19