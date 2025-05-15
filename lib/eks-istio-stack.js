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
        adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSServicePolicy'));
        adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));
        // Add KubectlLayer for CDK Lambda-backed kubectl
        const kubectlLayer = new lambda_layer_kubectl_v28_1.KubectlV28Layer(this, 'KubectlLayer');
        // Create EKS Cluster
        const cluster = new eks.Cluster(this, 'EksCluster', {
            version: eks.KubernetesVersion.V1_28,
            defaultCapacity: 2,
            mastersRole: adminRole,
            kubectlLayer: kubectlLayer,
        });
        // Map the IAM adminRole to Kubernetes RBAC system:masters group
        cluster.awsAuth.addRoleMapping(adminRole, {
            groups: ['system:masters'],
            // Optional: username can be customized if desired
            // username: 'eks-admin-role',
        });
        // Create Istio namespace
        const istioNamespace = cluster.addManifest('IstioNamespace', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'istio-system' },
        });
        // Install Istio Helm charts
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
        // Define Helm chart dependencies order
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
        // Deploy demo app versions
        const demoAppV1 = cluster.addManifest('DemoAppV1', ...demoV1Manifest);
        const demoAppV2 = cluster.addManifest('DemoAppV2', ...demoV2Manifest);
        demoAppV1.node.addDependency(demoNamespace);
        demoAppV2.node.addDependency(demoNamespace);
        // Deploy traffic routing manifests
        const destinationRule = cluster.addManifest('DestinationRule', ...destinationRuleManifest);
        const virtualService = cluster.addManifest('VirtualService', ...virtualServiceManifest);
        const gateway = cluster.addManifest('Gateway', ...gatewayManifest);
        destinationRule.node.addDependency(demoAppV1);
        destinationRule.node.addDependency(demoAppV2);
        virtualService.node.addDependency(demoAppV1);
        virtualService.node.addDependency(demoAppV2);
        gateway.node.addDependency(demoAppV1);
        gateway.node.addDependency(demoAppV2);
    }
}
exports.EksIstioStack = EksIstioStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLGdGQUFvRTtBQUVwRSxNQUFhLGFBQWMsU0FBUSxtQkFBSztJQUN0QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDakcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBQ3BHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUNqRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7UUFFN0csaURBQWlEO1FBQ2pELE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QscUJBQXFCO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLElBQUks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aWInO1xuaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBla3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgeWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCB7IEt1YmVjdGxWMjhMYXllciB9IGZyb20gJ0Bhd3MtY2RrL2xhbWJkYS1sYXllci1rdWJlY3RsLXYyOCc7XG5cbmV4cG9ydCBjbGFzcyBFa3NJc3Rpb1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBJQU0gUm9sZSBmb3IgRUtTIEFkbWluXG4gICAgY29uc3QgYWRtaW5Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdFa3NBZG1pblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQWNjb3VudFJvb3RQcmluY2lwYWwoKSxcbiAgICB9KTtcblxuICAgIGFkbWluUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTQ2x1c3RlclBvbGljeScpKTtcbiAgICBhZG1pblJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU1dvcmtlck5vZGVQb2xpY3knKSk7XG4gICAgYWRtaW5Sb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NTZXJ2aWNlUG9saWN5JykpO1xuICAgIGFkbWluUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUMyQ29udGFpbmVyUmVnaXN0cnlSZWFkT25seScpKTtcblxuICAgIC8vIEFkZCBLdWJlY3RsTGF5ZXIgZm9yIENESyBMYW1iZGEtYmFja2VkIGt1YmVjdGxcbiAgICBjb25zdCBrdWJlY3RsTGF5ZXIgPSBuZXcgS3ViZWN0bFYyOExheWVyKHRoaXMsICdLdWJlY3RsTGF5ZXInKTtcblxuICAgIC8vIENyZWF0ZSBFS1MgQ2x1c3RlclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0Vrc0NsdXN0ZXInLCB7XG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjgsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDIsXG4gICAgICBtYXN0ZXJzUm9sZTogYWRtaW5Sb2xlLFxuICAgICAga3ViZWN0bExheWVyOiBrdWJlY3RsTGF5ZXIsXG4gICAgfSk7XG5cbiAgICAvLyBNYXAgdGhlIElBTSBhZG1pblJvbGUgdG8gS3ViZXJuZXRlcyBSQkFDIHN5c3RlbTptYXN0ZXJzIGdyb3VwXG4gICAgY2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKGFkbWluUm9sZSwge1xuICAgICAgZ3JvdXBzOiBbJ3N5c3RlbTptYXN0ZXJzJ10sXG4gICAgICAvLyBPcHRpb25hbDogdXNlcm5hbWUgY2FuIGJlIGN1c3RvbWl6ZWQgaWYgZGVzaXJlZFxuICAgICAgLy8gdXNlcm5hbWU6ICdla3MtYWRtaW4tcm9sZScsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgSXN0aW8gbmFtZXNwYWNlXG4gICAgY29uc3QgaXN0aW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdJc3Rpb05hbWVzcGFjZScsIHtcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdpc3Rpby1zeXN0ZW0nIH0sXG4gICAgfSk7XG5cbiAgICAvLyBJbnN0YWxsIElzdGlvIEhlbG0gY2hhcnRzXG4gICAgY29uc3QgaXN0aW9CYXNlID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvQmFzZScsIHtcbiAgICAgIGNoYXJ0OiAnYmFzZScsXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1iYXNlJyxcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBpc3Rpb2QgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9kJywge1xuICAgICAgY2hhcnQ6ICdpc3Rpb2QnLFxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXG4gICAgICByZWxlYXNlOiAnaXN0aW9kJyxcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXG4gICAgICB2YWx1ZXM6IHtcbiAgICAgICAgZ2xvYmFsOiB7XG4gICAgICAgICAgaXN0aW9OYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlzdGlvSW5ncmVzcyA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0luZ3Jlc3MnLCB7XG4gICAgICBjaGFydDogJ2dhdGV3YXknLFxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXG4gICAgICByZWxlYXNlOiAnaXN0aW8taW5ncmVzcycsXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxuICAgIH0pO1xuXG4gICAgLy8gRGVmaW5lIEhlbG0gY2hhcnQgZGVwZW5kZW5jaWVzIG9yZGVyXG4gICAgaXN0aW9CYXNlLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb05hbWVzcGFjZSk7XG4gICAgaXN0aW9kLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb0Jhc2UpO1xuICAgIGlzdGlvSW5ncmVzcy5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9kKTtcblxuICAgIC8vIExvYWQgYWxsIG1hbmlmZXN0cyBmcm9tIHRoZSAnbWFuaWZlc3RzJyBmb2xkZXJcbiAgICBjb25zdCBtYW5pZmVzdHNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ21hbmlmZXN0cycpO1xuXG4gICAgY29uc3QgbG9hZE1hbmlmZXN0ID0gKGZpbGVuYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKG1hbmlmZXN0c1BhdGgsIGZpbGVuYW1lKTtcbiAgICAgIHJldHVybiB5YW1sLmxvYWRBbGwoZnMucmVhZEZpbGVTeW5jKGZ1bGxQYXRoLCAndXRmOCcpKSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+W107XG4gICAgfTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCduYW1lc3BhY2UueWFtbCcpO1xuICAgIGNvbnN0IGRlbW9WMU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdkZW1vLXYxLnlhbWwnKTtcbiAgICBjb25zdCBkZW1vVjJNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZGVtby12Mi55YW1sJyk7XG4gICAgY29uc3QgZGVzdGluYXRpb25SdWxlTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2Rlc3RpbmF0aW9uLXJ1bGUueWFtbCcpO1xuICAgIGNvbnN0IHZpcnR1YWxTZXJ2aWNlTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ3ZpcnR1YWwtc2VydmljZS55YW1sJyk7XG4gICAgY29uc3QgZ2F0ZXdheU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdnYXRld2F5LnlhbWwnKTtcblxuICAgIC8vIERlcGxveSAnZGVtbycgbmFtZXNwYWNlIGZyb20gWUFNTFxuICAgIGNvbnN0IGRlbW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vTmFtZXNwYWNlJywgLi4ubmFtZXNwYWNlTWFuaWZlc3QpO1xuXG4gICAgLy8gRGVwbG95IGRlbW8gYXBwIHZlcnNpb25zXG4gICAgY29uc3QgZGVtb0FwcFYxID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb0FwcFYxJywgLi4uZGVtb1YxTWFuaWZlc3QpO1xuICAgIGNvbnN0IGRlbW9BcHBWMiA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9BcHBWMicsIC4uLmRlbW9WMk1hbmlmZXN0KTtcblxuICAgIGRlbW9BcHBWMS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XG4gICAgZGVtb0FwcFYyLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vTmFtZXNwYWNlKTtcblxuICAgIC8vIERlcGxveSB0cmFmZmljIHJvdXRpbmcgbWFuaWZlc3RzXG4gICAgY29uc3QgZGVzdGluYXRpb25SdWxlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVzdGluYXRpb25SdWxlJywgLi4uZGVzdGluYXRpb25SdWxlTWFuaWZlc3QpO1xuICAgIGNvbnN0IHZpcnR1YWxTZXJ2aWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnVmlydHVhbFNlcnZpY2UnLCAuLi52aXJ0dWFsU2VydmljZU1hbmlmZXN0KTtcbiAgICBjb25zdCBnYXRld2F5ID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnR2F0ZXdheScsIC4uLmdhdGV3YXlNYW5pZmVzdCk7XG5cbiAgICBkZXN0aW5hdGlvblJ1bGUubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XG4gICAgZGVzdGluYXRpb25SdWxlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xuICAgIHZpcnR1YWxTZXJ2aWNlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjEpO1xuICAgIHZpcnR1YWxTZXJ2aWNlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xuICAgIGdhdGV3YXkubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XG4gICAgZ2F0ZXdheS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYyKTtcbiAgfVxufVxuIl19