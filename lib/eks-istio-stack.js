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
        const loadResources = (dir, files) => files.flatMap(file => yaml
            .parseAllDocuments(fs.readFileSync(path.join(dir, file), 'utf-8'))
            .map((doc) => doc.toJSON())
            .filter(Boolean));
        const resources = [
            ...loadResources(manifestsDir, appFiles),
            ...loadResources(istioDir, istioFiles)
        ];
        const appManifests = cluster.addManifest('AppManifests', ...resources);
        appManifests.node.addDependency(demoNamespace);
        appManifests.node.addDependency(istioNamespace);
    }
}
exports.EksIstioStack = EksIstioStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QixnRkFBb0U7QUFFcEUsTUFBYSxhQUFjLFNBQVEsbUJBQUs7SUFDeEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQ3hCLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsd0JBQXdCLENBQUMsQ0FDckUsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVk7U0FDYixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQzFELFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUU7U0FDckMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDN0IsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUMzRSxDQUFDO1FBRUYsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRTtZQUM3QyxRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLE1BQU0sRUFBRSxDQUFDLHNCQUFzQixFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQztTQUNuRSxDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRTtZQUMzRCxVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUUsV0FBVztZQUNqQixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFO1NBQ25DLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFO1lBQ3pELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7U0FDM0IsQ0FBQyxDQUFDO1FBRUgscUNBQXFDO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM3RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVsRCxNQUFNLFVBQVUsR0FBRztZQUNqQixpQkFBaUI7WUFDakIsb0JBQW9CO1lBQ3BCLGFBQWE7U0FDZCxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUc7WUFDZixjQUFjO1lBQ2QsY0FBYztZQUNkLHVCQUF1QjtZQUN2QixjQUFjO1lBQ2Qsc0JBQXNCO1NBQ3ZCLENBQUM7UUFFRixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFlLEVBQUUsRUFBRSxDQUNyRCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ25CLElBQUk7YUFDRCxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQ2pFLEdBQUcsQ0FBQyxDQUFDLEdBQVEsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQy9CLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FDbkIsQ0FBQztRQUVKLE1BQU0sU0FBUyxHQUFHO1lBQ2hCLEdBQUcsYUFBYSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUM7WUFDeEMsR0FBRyxhQUFhLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztTQUN2QyxDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztRQUN2RSxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMvQyxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0E7QUFwRkQsc0NBb0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWtzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAneWFtbCc7XG5pbXBvcnQgeyBLdWJlY3RsVjI4TGF5ZXIgfSBmcm9tICdAYXdzLWNkay9sYW1iZGEtbGF5ZXIta3ViZWN0bC12MjgnO1xuXG5leHBvcnQgY2xhc3MgRWtzSXN0aW9TdGFjayBleHRlbmRzIFN0YWNrIHtcbmNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbnN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG5jb25zdCBhZG1pblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0Vrc0FkbWluUm9sZScsIHtcbiAgYXNzdW1lZEJ5OiBuZXcgaWFtLkFjY291bnRSb290UHJpbmNpcGFsKCksXG59KTtcblxuYWRtaW5Sb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTQ2x1c3RlclBvbGljeScpXG4pO1xuXG5jb25zdCBrdWJlY3RsTGF5ZXIgPSBuZXcgS3ViZWN0bFYyOExheWVyKHRoaXMsICdLdWJlY3RsTGF5ZXInKTtcblxuY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnRWtzQ2x1c3RlcicsIHtcbiAgdmVyc2lvbjogZWtzLkt1YmVybmV0ZXNWZXJzaW9uLlYxXzI4LFxuICBkZWZhdWx0Q2FwYWNpdHk6IDAsXG4gIG1hc3RlcnNSb2xlOiBhZG1pblJvbGUsXG4gIGt1YmVjdGxMYXllcixcbn0pO1xuXG5jb25zdCBub2RlZ3JvdXAgPSBjbHVzdGVyLmFkZE5vZGVncm91cENhcGFjaXR5KCdOb2RlR3JvdXAnLCB7XG4gIGRlc2lyZWRTaXplOiAyLFxuICBpbnN0YW5jZVR5cGVzOiBbbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ3QzLm1lZGl1bScpXSxcbiAgcmVtb3RlQWNjZXNzOiB7IHNzaEtleU5hbWU6ICdkZW1vJyB9LFxufSk7XG5cbm5vZGVncm91cC5yb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZScpXG4pO1xuXG5jbHVzdGVyLmF3c0F1dGguYWRkUm9sZU1hcHBpbmcobm9kZWdyb3VwLnJvbGUsIHtcbiAgdXNlcm5hbWU6ICdzeXN0ZW06bm9kZTp7e0VDMlByaXZhdGVETlNOYW1lfX0nLFxuICBncm91cHM6IFsnc3lzdGVtOmJvb3RzdHJhcHBlcnMnLCAnc3lzdGVtOm5vZGVzJywgJ3N5c3RlbTptYXN0ZXJzJ10sXG59KTtcblxuLy8gQ3JlYXRlIHJlcXVpcmVkIG5hbWVzcGFjZXMgaW5saW5lXG5jb25zdCBpc3Rpb05hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0lzdGlvTmFtZXNwYWNlJywge1xuICBhcGlWZXJzaW9uOiAndjEnLFxuICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgbWV0YWRhdGE6IHsgbmFtZTogJ2lzdGlvLXN5c3RlbScgfSxcbn0pO1xuXG5jb25zdCBkZW1vTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb05hbWVzcGFjZScsIHtcbiAgYXBpVmVyc2lvbjogJ3YxJyxcbiAga2luZDogJ05hbWVzcGFjZScsXG4gIG1ldGFkYXRhOiB7IG5hbWU6ICdkZW1vJyB9LFxufSk7XG5cbi8vIE1hbmlmZXN0IGxvYWRlciAoeW91ciBleGFjdCBibG9jaylcbmNvbnN0IG1hbmlmZXN0c0RpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdtYW5pZmVzdHMnKTtcbmNvbnN0IGlzdGlvRGlyID0gcGF0aC5qb2luKG1hbmlmZXN0c0RpciwgJ2lzdGlvJyk7XG5cbmNvbnN0IGlzdGlvRmlsZXMgPSBbXG4gICdpc3Rpby1iYXNlLnlhbWwnLFxuICAnaXN0aW8taW5ncmVzcy55YW1sJyxcbiAgJ2lzdGlvZC55YW1sJ1xuXTtcblxuY29uc3QgYXBwRmlsZXMgPSBbXG4gICdkZW1vLXYxLnlhbWwnLFxuICAnZGVtby12Mi55YW1sJyxcbiAgJ2Rlc3RpbmF0aW9uLXJ1bGUueWFtbCcsXG4gICdnYXRld2F5LnlhbWwnLFxuICAndmlydHVhbC1zZXJ2aWNlLnlhbWwnXG5dO1xuXG5jb25zdCBsb2FkUmVzb3VyY2VzID0gKGRpcjogc3RyaW5nLCBmaWxlczogc3RyaW5nW10pID0+XG4gIGZpbGVzLmZsYXRNYXAoZmlsZSA9PlxuICAgIHlhbWxcbiAgICAgIC5wYXJzZUFsbERvY3VtZW50cyhmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKGRpciwgZmlsZSksICd1dGYtOCcpKVxuICAgICAgLm1hcCgoZG9jOiBhbnkpID0+IGRvYy50b0pTT04oKSlcbiAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgKTtcblxuY29uc3QgcmVzb3VyY2VzID0gW1xuICAuLi5sb2FkUmVzb3VyY2VzKG1hbmlmZXN0c0RpciwgYXBwRmlsZXMpLFxuICAuLi5sb2FkUmVzb3VyY2VzKGlzdGlvRGlyLCBpc3Rpb0ZpbGVzKVxuXTtcblxuY29uc3QgYXBwTWFuaWZlc3RzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnQXBwTWFuaWZlc3RzJywgLi4ucmVzb3VyY2VzKTtcbmFwcE1hbmlmZXN0cy5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XG5hcHBNYW5pZmVzdHMubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvTmFtZXNwYWNlKTtcbn1cbn0iXX0=