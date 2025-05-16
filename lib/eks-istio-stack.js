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
        cluster.awsAuth.addRoleMapping(adminRole, {
            groups: ['system:masters']
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLGdGQUFvRTtBQUVwRSxNQUFhLGFBQWMsU0FBUSxtQkFBSztJQUN0QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDakcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBRXBHLGlEQUFpRDtRQUNqRCxNQUFNLFlBQVksR0FBRyxJQUFJLDBDQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRS9ELHFCQUFxQjtRQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNsRCxPQUFPLEVBQUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEtBQUs7WUFDcEMsZUFBZSxFQUFFLENBQUM7WUFDbEIsV0FBVyxFQUFFLFNBQVM7WUFDdEIsWUFBWSxFQUFFLFlBQVk7U0FDM0IsQ0FBQyxDQUFDO1FB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LGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1QyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUU1QyxtQ0FBbUM7UUFDbkMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLHVCQUF1QixDQUFDLENBQUM7UUFDM0YsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLHNCQUFzQixDQUFDLENBQUM7UUFDeEYsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUVuRSxlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQ0Y7QUF2R0Qsc0NBdUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWtzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgeyBLdWJlY3RsVjI4TGF5ZXIgfSBmcm9tICdAYXdzLWNkay9sYW1iZGEtbGF5ZXIta3ViZWN0bC12MjgnO1xuXG5leHBvcnQgY2xhc3MgRWtzSXN0aW9TdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gSUFNIFJvbGUgZm9yIEVLUyBBZG1pblxuICAgIGNvbnN0IGFkbWluUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRWtzQWRtaW5Sb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkFjY291bnRSb290UHJpbmNpcGFsKCksXG4gICAgfSk7XG5cbiAgICBhZG1pblJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU0NsdXN0ZXJQb2xpY3knKSk7XG4gICAgYWRtaW5Sb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NXb3JrZXJOb2RlUG9saWN5JykpO1xuXG4gICAgLy8gQWRkIEt1YmVjdGxMYXllciBmb3IgQ0RLIExhbWJkYS1iYWNrZWQga3ViZWN0bFxuICAgIGNvbnN0IGt1YmVjdGxMYXllciA9IG5ldyBLdWJlY3RsVjI4TGF5ZXIodGhpcywgJ0t1YmVjdGxMYXllcicpO1xuXG4gICAgLy8gQ3JlYXRlIEVLUyBDbHVzdGVyXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnRWtzQ2x1c3RlcicsIHtcbiAgICAgIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8yOCxcbiAgICAgIGRlZmF1bHRDYXBhY2l0eTogMixcbiAgICAgIG1hc3RlcnNSb2xlOiBhZG1pblJvbGUsXG4gICAgICBrdWJlY3RsTGF5ZXI6IGt1YmVjdGxMYXllcixcbiAgICB9KTtcblxuICAgIGNsdXN0ZXIuYXdzQXV0aC5hZGRSb2xlTWFwcGluZyhhZG1pblJvbGUsIHtcbiAgICAgICAgZ3JvdXBzOiBbJ3N5c3RlbTptYXN0ZXJzJ11cbiAgICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgSXN0aW8gbmFtZXNwYWNlXG4gICAgY29uc3QgaXN0aW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdJc3Rpb05hbWVzcGFjZScsIHtcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdpc3Rpby1zeXN0ZW0nIH0sXG4gICAgfSk7XG5cbiAgICAvLyBJbnN0YWxsIElzdGlvIEhlbG0gY2hhcnRzXG4gICAgY29uc3QgaXN0aW9CYXNlID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvQmFzZScsIHtcbiAgICAgIGNoYXJ0OiAnYmFzZScsXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1iYXNlJyxcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBpc3Rpb2QgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9kJywge1xuICAgICAgY2hhcnQ6ICdpc3Rpb2QnLFxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXG4gICAgICByZWxlYXNlOiAnaXN0aW9kJyxcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXG4gICAgICB2YWx1ZXM6IHtcbiAgICAgICAgZ2xvYmFsOiB7XG4gICAgICAgICAgaXN0aW9OYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlzdGlvSW5ncmVzcyA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0luZ3Jlc3MnLCB7XG4gICAgICBjaGFydDogJ2dhdGV3YXknLFxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXG4gICAgICByZWxlYXNlOiAnaXN0aW8taW5ncmVzcycsXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxuICAgIH0pO1xuXG4gICAgLy8gRGVmaW5lIEhlbG0gY2hhcnQgZGVwZW5kZW5jaWVzIG9yZGVyXG4gICAgaXN0aW9CYXNlLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb05hbWVzcGFjZSk7XG4gICAgaXN0aW9kLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb0Jhc2UpO1xuICAgIGlzdGlvSW5ncmVzcy5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9kKTtcblxuICAgIC8vIExvYWQgYWxsIG1hbmlmZXN0cyBmcm9tIHRoZSAnbWFuaWZlc3RzJyBmb2xkZXJcbiAgICBjb25zdCBtYW5pZmVzdHNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ21hbmlmZXN0cycpO1xuXG4gICAgY29uc3QgbG9hZE1hbmlmZXN0ID0gKGZpbGVuYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKG1hbmlmZXN0c1BhdGgsIGZpbGVuYW1lKTtcbiAgICAgIHJldHVybiB5YW1sLmxvYWRBbGwoZnMucmVhZEZpbGVTeW5jKGZ1bGxQYXRoLCAndXRmOCcpKSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+W107XG4gICAgfTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCduYW1lc3BhY2UueWFtbCcpO1xuICAgIGNvbnN0IGRlbW9WMU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdkZW1vLXYxLnlhbWwnKTtcbiAgICBjb25zdCBkZW1vVjJNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZGVtby12Mi55YW1sJyk7XG4gICAgY29uc3QgZGVzdGluYXRpb25SdWxlTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2Rlc3RpbmF0aW9uLXJ1bGUueWFtbCcpO1xuICAgIGNvbnN0IHZpcnR1YWxTZXJ2aWNlTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ3ZpcnR1YWwtc2VydmljZS55YW1sJyk7XG4gICAgY29uc3QgZ2F0ZXdheU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdnYXRld2F5LnlhbWwnKTtcblxuICAgIC8vIERlcGxveSAnZGVtbycgbmFtZXNwYWNlIGZyb20gWUFNTFxuICAgIGNvbnN0IGRlbW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vTmFtZXNwYWNlJywgLi4ubmFtZXNwYWNlTWFuaWZlc3QpO1xuXG4gICAgLy8gRGVwbG95IGRlbW8gYXBwIHZlcnNpb25zXG4gICAgY29uc3QgZGVtb0FwcFYxID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb0FwcFYxJywgLi4uZGVtb1YxTWFuaWZlc3QpO1xuICAgIGNvbnN0IGRlbW9BcHBWMiA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9BcHBWMicsIC4uLmRlbW9WMk1hbmlmZXN0KTtcblxuICAgIGRlbW9BcHBWMS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XG4gICAgZGVtb0FwcFYyLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vTmFtZXNwYWNlKTtcblxuICAgIC8vIERlcGxveSB0cmFmZmljIHJvdXRpbmcgbWFuaWZlc3RzXG4gICAgY29uc3QgZGVzdGluYXRpb25SdWxlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVzdGluYXRpb25SdWxlJywgLi4uZGVzdGluYXRpb25SdWxlTWFuaWZlc3QpO1xuICAgIGNvbnN0IHZpcnR1YWxTZXJ2aWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnVmlydHVhbFNlcnZpY2UnLCAuLi52aXJ0dWFsU2VydmljZU1hbmlmZXN0KTtcbiAgICBjb25zdCBnYXRld2F5ID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnR2F0ZXdheScsIC4uLmdhdGV3YXlNYW5pZmVzdCk7XG5cbiAgICBkZXN0aW5hdGlvblJ1bGUubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XG4gICAgZGVzdGluYXRpb25SdWxlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xuICAgIHZpcnR1YWxTZXJ2aWNlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjEpO1xuICAgIHZpcnR1YWxTZXJ2aWNlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xuICAgIGdhdGV3YXkubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XG4gICAgZ2F0ZXdheS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYyKTtcbiAgfVxufVxuIl19