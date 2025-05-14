"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EksIstioStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const eks = require("aws-cdk-lib/aws-eks");
const iam = require("aws-cdk-lib/aws-iam");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const lambda_layer_kubectl_v28_1 = require("@aws-cdk/lambda-layer-kubectl-v28");
class EksIstioStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // IAM Role for EKS Admin
        const adminRole = new iam.Role(this, 'EksAdminRole', {
            assumedBy: new iam.AccountRootPrincipal(),
        });
        adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'));
        adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'));
        // Add KubectlLayer for CDK Lambda-backed kubectl
        const kubectlLayer = new lambda_layer_kubectl_v28_1.KubectlV28Layer(this, 'KubectlLayer');
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
        const loadManifest = (filename) => {
            const fullPath = path.join(manifestsPath, filename);
            return yaml.loadAll(fs.readFileSync(fullPath, 'utf8'));
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
exports.EksIstioStack = EksIstioStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLGdGQUFvRTtBQUVwRSxNQUFhLGFBQWMsU0FBUSxtQkFBSztJQUN0QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDakcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBRXBHLGlEQUFpRDtRQUNqRCxNQUFNLFlBQVksR0FBRyxJQUFJLDBDQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRS9ELHFCQUFxQjtRQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNsRCxPQUFPLEVBQUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEtBQUs7WUFDcEMsZUFBZSxFQUFFLENBQUM7WUFDbEIsV0FBVyxFQUFFLFNBQVM7WUFDdEIsWUFBWSxFQUFFLFlBQVk7U0FDM0IsQ0FBQyxDQUFDO1FB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QyxtQ0FBbUM7UUFDbkMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLHVCQUF1QixDQUFDLENBQUM7UUFDM0YsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLHNCQUFzQixDQUFDLENBQUM7UUFDeEYsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUVuRSxtREFBbUQ7UUFDbkQsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDeEMsQ0FBQztDQUNGO0FBckdELHNDQXFHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVrcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHsgS3ViZWN0bFYyOExheWVyIH0gZnJvbSAnQGF3cy1jZGsvbGFtYmRhLWxheWVyLWt1YmVjdGwtdjI4JztcblxuZXhwb3J0IGNsYXNzIEVrc0lzdGlvU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIElBTSBSb2xlIGZvciBFS1MgQWRtaW5cbiAgICBjb25zdCBhZG1pblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0Vrc0FkbWluUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5BY2NvdW50Um9vdFByaW5jaXBhbCgpLFxuICAgIH0pO1xuXG4gICAgYWRtaW5Sb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NDbHVzdGVyUG9saWN5JykpO1xuICAgIGFkbWluUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTV29ya2VyTm9kZVBvbGljeScpKTtcblxuICAgIC8vIEFkZCBLdWJlY3RsTGF5ZXIgZm9yIENESyBMYW1iZGEtYmFja2VkIGt1YmVjdGxcbiAgICBjb25zdCBrdWJlY3RsTGF5ZXIgPSBuZXcgS3ViZWN0bFYyOExheWVyKHRoaXMsICdLdWJlY3RsTGF5ZXInKTtcblxuICAgIC8vIENyZWF0ZSBFS1MgQ2x1c3RlclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0Vrc0NsdXN0ZXInLCB7XG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjgsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDIsXG4gICAgICBtYXN0ZXJzUm9sZTogYWRtaW5Sb2xlLFxuICAgICAga3ViZWN0bExheWVyOiBrdWJlY3RsTGF5ZXIsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgSXN0aW8gbmFtZXNwYWNlXG4gICAgY29uc3QgaXN0aW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdJc3Rpb05hbWVzcGFjZScsIHtcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdpc3Rpby1zeXN0ZW0nIH0sXG4gICAgfSk7XG5cbiAgICAvLyBJbnN0YWxsIElzdGlvIGNvbXBvbmVudHNcbiAgICBjb25zdCBpc3Rpb0Jhc2UgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9CYXNlJywge1xuICAgICAgY2hhcnQ6ICdiYXNlJyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxuICAgICAgcmVsZWFzZTogJ2lzdGlvLWJhc2UnLFxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlzdGlvZCA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb2QnLCB7XG4gICAgICBjaGFydDogJ2lzdGlvZCcsXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcbiAgICAgIHJlbGVhc2U6ICdpc3Rpb2QnLFxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcbiAgICAgIHZhbHVlczoge1xuICAgICAgICBnbG9iYWw6IHtcbiAgICAgICAgICBpc3Rpb05hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgaXN0aW9JbmdyZXNzID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvSW5ncmVzcycsIHtcbiAgICAgIGNoYXJ0OiAnZ2F0ZXdheScsXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1pbmdyZXNzJyxcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXG4gICAgfSk7XG5cbiAgICAvLyBTZXQgSXN0aW8gY2hhcnQgZGVwbG95bWVudCBvcmRlclxuICAgIGlzdGlvQmFzZS5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9OYW1lc3BhY2UpO1xuICAgIGlzdGlvZC5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9CYXNlKTtcbiAgICBpc3Rpb0luZ3Jlc3Mubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvZCk7XG5cbiAgICAvLyBMb2FkIGFsbCBtYW5pZmVzdHMgZnJvbSB0aGUgJ21hbmlmZXN0cycgZm9sZGVyXG4gICAgY29uc3QgbWFuaWZlc3RzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdtYW5pZmVzdHMnKTtcblxuICAgIGNvbnN0IGxvYWRNYW5pZmVzdCA9IChmaWxlbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihtYW5pZmVzdHNQYXRoLCBmaWxlbmFtZSk7XG4gICAgICByZXR1cm4geWFtbC5sb2FkQWxsKGZzLnJlYWRGaWxlU3luYyhmdWxsUGF0aCwgJ3V0ZjgnKSkgYXMgUmVjb3JkPHN0cmluZywgYW55PltdO1xuICAgIH07XG5cbiAgICBjb25zdCBuYW1lc3BhY2VNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnbmFtZXNwYWNlLnlhbWwnKTtcbiAgICBjb25zdCBkZW1vVjFNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZGVtby12MS55YW1sJyk7XG4gICAgY29uc3QgZGVtb1YyTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2RlbW8tdjIueWFtbCcpO1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uUnVsZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdkZXN0aW5hdGlvbi1ydWxlLnlhbWwnKTtcbiAgICBjb25zdCB2aXJ0dWFsU2VydmljZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCd2aXJ0dWFsLXNlcnZpY2UueWFtbCcpO1xuICAgIGNvbnN0IGdhdGV3YXlNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZ2F0ZXdheS55YW1sJyk7XG5cbiAgICAvLyBEZXBsb3kgJ2RlbW8nIG5hbWVzcGFjZSBmcm9tIFlBTUxcbiAgICBjb25zdCBkZW1vTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb05hbWVzcGFjZScsIC4uLm5hbWVzcGFjZU1hbmlmZXN0KTtcblxuICAgIC8vIERlcGxveSBhcHAgdmVyc2lvbnNcbiAgICBjb25zdCBkZW1vQXBwVjEgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vQXBwVjEnLCAuLi5kZW1vVjFNYW5pZmVzdCk7XG4gICAgY29uc3QgZGVtb0FwcFYyID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb0FwcFYyJywgLi4uZGVtb1YyTWFuaWZlc3QpO1xuXG4gICAgLy8gU2V0IGFwcCBkZXBlbmRlbmNpZXMgb24gbmFtZXNwYWNlXG4gICAgZGVtb0FwcFYxLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vTmFtZXNwYWNlKTtcbiAgICBkZW1vQXBwVjIubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9OYW1lc3BhY2UpO1xuXG4gICAgLy8gRGVwbG95IHRyYWZmaWMgY29udHJvbCBtYW5pZmVzdHNcbiAgICBjb25zdCBkZXN0aW5hdGlvblJ1bGUgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZXN0aW5hdGlvblJ1bGUnLCAuLi5kZXN0aW5hdGlvblJ1bGVNYW5pZmVzdCk7XG4gICAgY29uc3QgdmlydHVhbFNlcnZpY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdWaXJ0dWFsU2VydmljZScsIC4uLnZpcnR1YWxTZXJ2aWNlTWFuaWZlc3QpO1xuICAgIGNvbnN0IGdhdGV3YXkgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdHYXRld2F5JywgLi4uZ2F0ZXdheU1hbmlmZXN0KTtcblxuICAgIC8vIEVuc3VyZSB0cmFmZmljIGNvbmZpZ3MgZGVwbG95IGFmdGVyIGFwcCB2ZXJzaW9uc1xuICAgIGRlc3RpbmF0aW9uUnVsZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYxKTtcbiAgICBkZXN0aW5hdGlvblJ1bGUubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMik7XG4gICAgdmlydHVhbFNlcnZpY2Uubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XG4gICAgdmlydHVhbFNlcnZpY2Uubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMik7XG4gICAgZ2F0ZXdheS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYxKTtcbiAgICBnYXRld2F5Lm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xuICB9XG59XG4iXX0=