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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLGdGQUFvRTtBQUVwRSxNQUFhLGFBQWMsU0FBUSxtQkFBSztJQUN0QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFFakcsaURBQWlEO1FBQ2pELE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QscUJBQXFCO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ2xELE9BQU8sRUFBRSxHQUFHLENBQUMsaUJBQWlCLENBQUMsS0FBSztZQUNwQyxlQUFlLEVBQUUsQ0FBQztZQUNsQixXQUFXLEVBQUUsU0FBUztZQUN0QixZQUFZLEVBQUUsWUFBWTtTQUMzQixDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUU7WUFDdEMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDM0Is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LG1DQUFtQztRQUNuQyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsdUJBQXVCLENBQUMsQ0FBQztRQUMzRixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsc0JBQXNCLENBQUMsQ0FBQztRQUN4RixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLGVBQWUsQ0FBQyxDQUFDO1FBRW5FLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRjtBQXRHRCxzQ0FzR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBla3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgeWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCB7IEt1YmVjdGxWMjhMYXllciB9IGZyb20gJ0Bhd3MtY2RrL2xhbWJkYS1sYXllci1rdWJlY3RsLXYyOCc7XG5cbmV4cG9ydCBjbGFzcyBFa3NJc3Rpb1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBJQU0gUm9sZSBmb3IgRUtTIEFkbWluXG4gICAgY29uc3QgYWRtaW5Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdFa3NBZG1pblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQWNjb3VudFJvb3RQcmluY2lwYWwoKSxcbiAgICB9KTtcblxuICAgIGFkbWluUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTQ2x1c3RlclBvbGljeScpKTtcblxuICAgIC8vIEFkZCBLdWJlY3RsTGF5ZXIgZm9yIENESyBMYW1iZGEtYmFja2VkIGt1YmVjdGxcbiAgICBjb25zdCBrdWJlY3RsTGF5ZXIgPSBuZXcgS3ViZWN0bFYyOExheWVyKHRoaXMsICdLdWJlY3RsTGF5ZXInKTtcblxuICAgIC8vIENyZWF0ZSBFS1MgQ2x1c3RlclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0Vrc0NsdXN0ZXInLCB7XG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjgsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDIsXG4gICAgICBtYXN0ZXJzUm9sZTogYWRtaW5Sb2xlLFxuICAgICAga3ViZWN0bExheWVyOiBrdWJlY3RsTGF5ZXIsXG4gICAgfSk7XG5cbiAgICBjbHVzdGVyLmF3c0F1dGguYWRkUm9sZU1hcHBpbmcoYWRtaW5Sb2xlLCB7XG4gICAgICAgIGdyb3VwczogWydzeXN0ZW06bWFzdGVycyddXG4gICAgICB9KVxuXG4gICAgLy8gQ3JlYXRlIElzdGlvIG5hbWVzcGFjZVxuICAgIGNvbnN0IGlzdGlvTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnSXN0aW9OYW1lc3BhY2UnLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnaXN0aW8tc3lzdGVtJyB9LFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFsbCBJc3RpbyBIZWxtIGNoYXJ0c1xuICAgIGNvbnN0IGlzdGlvQmFzZSA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0Jhc2UnLCB7XG4gICAgICBjaGFydDogJ2Jhc2UnLFxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXG4gICAgICByZWxlYXNlOiAnaXN0aW8tYmFzZScsXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaXN0aW9kID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvZCcsIHtcbiAgICAgIGNoYXJ0OiAnaXN0aW9kJyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxuICAgICAgcmVsZWFzZTogJ2lzdGlvZCcsXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxuICAgICAgdmFsdWVzOiB7XG4gICAgICAgIGdsb2JhbDoge1xuICAgICAgICAgIGlzdGlvTmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBpc3Rpb0luZ3Jlc3MgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9JbmdyZXNzJywge1xuICAgICAgY2hhcnQ6ICdnYXRld2F5JyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxuICAgICAgcmVsZWFzZTogJ2lzdGlvLWluZ3Jlc3MnLFxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcbiAgICB9KTtcblxuICAgIC8vIERlZmluZSBIZWxtIGNoYXJ0IGRlcGVuZGVuY2llcyBvcmRlclxuICAgIGlzdGlvQmFzZS5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9OYW1lc3BhY2UpO1xuICAgIGlzdGlvZC5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9CYXNlKTtcbiAgICBpc3Rpb0luZ3Jlc3Mubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvZCk7XG5cbiAgICAvLyBMb2FkIGFsbCBtYW5pZmVzdHMgZnJvbSB0aGUgJ21hbmlmZXN0cycgZm9sZGVyXG4gICAgY29uc3QgbWFuaWZlc3RzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdtYW5pZmVzdHMnKTtcblxuICAgIGNvbnN0IGxvYWRNYW5pZmVzdCA9IChmaWxlbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihtYW5pZmVzdHNQYXRoLCBmaWxlbmFtZSk7XG4gICAgICByZXR1cm4geWFtbC5sb2FkQWxsKGZzLnJlYWRGaWxlU3luYyhmdWxsUGF0aCwgJ3V0ZjgnKSkgYXMgUmVjb3JkPHN0cmluZywgYW55PltdO1xuICAgIH07XG5cbiAgICBjb25zdCBuYW1lc3BhY2VNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnbmFtZXNwYWNlLnlhbWwnKTtcbiAgICBjb25zdCBkZW1vVjFNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZGVtby12MS55YW1sJyk7XG4gICAgY29uc3QgZGVtb1YyTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2RlbW8tdjIueWFtbCcpO1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uUnVsZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdkZXN0aW5hdGlvbi1ydWxlLnlhbWwnKTtcbiAgICBjb25zdCB2aXJ0dWFsU2VydmljZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCd2aXJ0dWFsLXNlcnZpY2UueWFtbCcpO1xuICAgIGNvbnN0IGdhdGV3YXlNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZ2F0ZXdheS55YW1sJyk7XG5cbiAgICAvLyBEZXBsb3kgJ2RlbW8nIG5hbWVzcGFjZSBmcm9tIFlBTUxcbiAgICBjb25zdCBkZW1vTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb05hbWVzcGFjZScsIC4uLm5hbWVzcGFjZU1hbmlmZXN0KTtcblxuICAgIC8vIERlcGxveSBkZW1vIGFwcCB2ZXJzaW9uc1xuICAgIGNvbnN0IGRlbW9BcHBWMSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9BcHBWMScsIC4uLmRlbW9WMU1hbmlmZXN0KTtcbiAgICBjb25zdCBkZW1vQXBwVjIgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vQXBwVjInLCAuLi5kZW1vVjJNYW5pZmVzdCk7XG5cbiAgICBkZW1vQXBwVjEubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9OYW1lc3BhY2UpO1xuICAgIGRlbW9BcHBWMi5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XG5cbiAgICAvLyBEZXBsb3kgdHJhZmZpYyByb3V0aW5nIG1hbmlmZXN0c1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uUnVsZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0Rlc3RpbmF0aW9uUnVsZScsIC4uLmRlc3RpbmF0aW9uUnVsZU1hbmlmZXN0KTtcbiAgICBjb25zdCB2aXJ0dWFsU2VydmljZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ1ZpcnR1YWxTZXJ2aWNlJywgLi4udmlydHVhbFNlcnZpY2VNYW5pZmVzdCk7XG4gICAgY29uc3QgZ2F0ZXdheSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0dhdGV3YXknLCAuLi5nYXRld2F5TWFuaWZlc3QpO1xuXG4gICAgZGVzdGluYXRpb25SdWxlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjEpO1xuICAgIGRlc3RpbmF0aW9uUnVsZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYyKTtcbiAgICB2aXJ0dWFsU2VydmljZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYxKTtcbiAgICB2aXJ0dWFsU2VydmljZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYyKTtcbiAgICBnYXRld2F5Lm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjEpO1xuICAgIGdhdGV3YXkubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMik7XG4gIH1cbn1cbiJdfQ==