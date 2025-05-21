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
        const adminRole = new iam.Role(this, 'EksAdminRole', {
            assumedBy: new iam.AccountRootPrincipal(),
        });
        adminRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'));
        const kubectlLayer = new lambda_layer_kubectl_v28_1.KubectlV28Layer(this, 'KubectlLayer');
        const cluster = new eks.Cluster(this, 'EksCluster', {
            version: eks.KubernetesVersion.V1_28,
            defaultCapacity: 2,
            mastersRole: adminRole,
            kubectlLayer: kubectlLayer,
        });
        const istioNamespace = cluster.addManifest('IstioNamespace', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'istio-system' },
        });
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
        istioBase.node.addDependency(istioNamespace);
        istiod.node.addDependency(istioBase);
        istioIngress.node.addDependency(istiod);
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
        const demoNamespace = cluster.addManifest('DemoNamespace', ...namespaceManifest);
        const demoAppV1 = cluster.addManifest('DemoAppV1', ...demoV1Manifest);
        const demoAppV2 = cluster.addManifest('DemoAppV2', ...demoV2Manifest);
        demoAppV1.node.addDependency(demoNamespace);
        demoAppV2.node.addDependency(demoNamespace);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLGdGQUFvRTtBQUVwRSxNQUFhLGFBQWMsU0FBUSxtQkFBSztJQUN0QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDbkQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLG9CQUFvQixFQUFFO1NBQzFDLENBQUMsQ0FBQztRQUVILFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUVqRyxNQUFNLFlBQVksR0FBRyxJQUFJLDBDQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRS9ELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ2xELE9BQU8sRUFBRSxHQUFHLENBQUMsaUJBQWlCLENBQUMsS0FBSztZQUNwQyxlQUFlLEVBQUUsQ0FBQztZQUNsQixXQUFXLEVBQUUsU0FBUztZQUN0QixZQUFZLEVBQUUsWUFBWTtTQUMzQixDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFO1lBQzNELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUU7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUU7WUFDbEQsS0FBSyxFQUFFLE1BQU07WUFDYixVQUFVLEVBQUUscURBQXFEO1lBQ2pFLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLFNBQVMsRUFBRSxjQUFjO1NBQzFCLENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO1lBQzVDLEtBQUssRUFBRSxRQUFRO1lBQ2YsVUFBVSxFQUFFLHFEQUFxRDtZQUNqRSxPQUFPLEVBQUUsUUFBUTtZQUNqQixTQUFTLEVBQUUsY0FBYztZQUN6QixNQUFNLEVBQUU7Z0JBQ04sTUFBTSxFQUFFO29CQUNOLGNBQWMsRUFBRSxjQUFjO2lCQUMvQjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUU7WUFDeEQsS0FBSyxFQUFFLFNBQVM7WUFDaEIsVUFBVSxFQUFFLHFEQUFxRDtZQUNqRSxPQUFPLEVBQUUsZUFBZTtZQUN4QixTQUFTLEVBQUUsY0FBYztTQUMxQixDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyQyxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV4QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFOUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQUU7WUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDcEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUEwQixDQUFDO1FBQ2xGLENBQUMsQ0FBQztRQUVGLE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDekQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRCxNQUFNLHVCQUF1QixHQUFHLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sc0JBQXNCLEdBQUcsWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEUsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXJELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsQ0FBQztRQUVqRixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxHQUFHLGNBQWMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEdBQUcsY0FBYyxDQUFDLENBQUM7UUFFdEUsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDNUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFNUMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLHVCQUF1QixDQUFDLENBQUM7UUFDM0YsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLHNCQUFzQixDQUFDLENBQUM7UUFDeEYsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUVuRSxlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQ0Y7QUF4RkQsc0NBd0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVrcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XHJcbmltcG9ydCB7IEt1YmVjdGxWMjhMYXllciB9IGZyb20gJ0Bhd3MtY2RrL2xhbWJkYS1sYXllci1rdWJlY3RsLXYyOCc7XHJcblxyXG5leHBvcnQgY2xhc3MgRWtzSXN0aW9TdGFjayBleHRlbmRzIFN0YWNrIHtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCBhZG1pblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0Vrc0FkbWluUm9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkFjY291bnRSb290UHJpbmNpcGFsKCksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhZG1pblJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU0NsdXN0ZXJQb2xpY3knKSk7XHJcblxyXG4gICAgY29uc3Qga3ViZWN0bExheWVyID0gbmV3IEt1YmVjdGxWMjhMYXllcih0aGlzLCAnS3ViZWN0bExheWVyJyk7XHJcblxyXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnRWtzQ2x1c3RlcicsIHtcclxuICAgICAgdmVyc2lvbjogZWtzLkt1YmVybmV0ZXNWZXJzaW9uLlYxXzI4LFxyXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDIsXHJcbiAgICAgIG1hc3RlcnNSb2xlOiBhZG1pblJvbGUsXHJcbiAgICAgIGt1YmVjdGxMYXllcjoga3ViZWN0bExheWVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXN0aW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdJc3Rpb05hbWVzcGFjZScsIHtcclxuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcclxuICAgICAga2luZDogJ05hbWVzcGFjZScsXHJcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdpc3Rpby1zeXN0ZW0nIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBpc3Rpb0Jhc2UgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9CYXNlJywge1xyXG4gICAgICBjaGFydDogJ2Jhc2UnLFxyXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcclxuICAgICAgcmVsZWFzZTogJ2lzdGlvLWJhc2UnLFxyXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXN0aW9kID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvZCcsIHtcclxuICAgICAgY2hhcnQ6ICdpc3Rpb2QnLFxyXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcclxuICAgICAgcmVsZWFzZTogJ2lzdGlvZCcsXHJcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXHJcbiAgICAgIHZhbHVlczoge1xyXG4gICAgICAgIGdsb2JhbDoge1xyXG4gICAgICAgICAgaXN0aW9OYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBpc3Rpb0luZ3Jlc3MgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9JbmdyZXNzJywge1xyXG4gICAgICBjaGFydDogJ2dhdGV3YXknLFxyXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcclxuICAgICAgcmVsZWFzZTogJ2lzdGlvLWluZ3Jlc3MnLFxyXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaXN0aW9CYXNlLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb05hbWVzcGFjZSk7XHJcbiAgICBpc3Rpb2Qubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvQmFzZSk7XHJcbiAgICBpc3Rpb0luZ3Jlc3Mubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvZCk7XHJcblxyXG4gICAgY29uc3QgbWFuaWZlc3RzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdtYW5pZmVzdHMnKTtcclxuXHJcbiAgICBjb25zdCBsb2FkTWFuaWZlc3QgPSAoZmlsZW5hbWU6IHN0cmluZykgPT4ge1xyXG4gICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihtYW5pZmVzdHNQYXRoLCBmaWxlbmFtZSk7XHJcbiAgICAgIHJldHVybiB5YW1sLmxvYWRBbGwoZnMucmVhZEZpbGVTeW5jKGZ1bGxQYXRoLCAndXRmOCcpKSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+W107XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IG5hbWVzcGFjZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCduYW1lc3BhY2UueWFtbCcpO1xyXG4gICAgY29uc3QgZGVtb1YxTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2RlbW8tdjEueWFtbCcpO1xyXG4gICAgY29uc3QgZGVtb1YyTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2RlbW8tdjIueWFtbCcpO1xyXG4gICAgY29uc3QgZGVzdGluYXRpb25SdWxlTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2Rlc3RpbmF0aW9uLXJ1bGUueWFtbCcpO1xyXG4gICAgY29uc3QgdmlydHVhbFNlcnZpY2VNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgndmlydHVhbC1zZXJ2aWNlLnlhbWwnKTtcclxuICAgIGNvbnN0IGdhdGV3YXlNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZ2F0ZXdheS55YW1sJyk7XHJcblxyXG4gICAgY29uc3QgZGVtb05hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9OYW1lc3BhY2UnLCAuLi5uYW1lc3BhY2VNYW5pZmVzdCk7XHJcblxyXG4gICAgY29uc3QgZGVtb0FwcFYxID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb0FwcFYxJywgLi4uZGVtb1YxTWFuaWZlc3QpO1xyXG4gICAgY29uc3QgZGVtb0FwcFYyID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb0FwcFYyJywgLi4uZGVtb1YyTWFuaWZlc3QpO1xyXG5cclxuICAgIGRlbW9BcHBWMS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XHJcbiAgICBkZW1vQXBwVjIubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9OYW1lc3BhY2UpO1xyXG5cclxuICAgIGNvbnN0IGRlc3RpbmF0aW9uUnVsZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0Rlc3RpbmF0aW9uUnVsZScsIC4uLmRlc3RpbmF0aW9uUnVsZU1hbmlmZXN0KTtcclxuICAgIGNvbnN0IHZpcnR1YWxTZXJ2aWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnVmlydHVhbFNlcnZpY2UnLCAuLi52aXJ0dWFsU2VydmljZU1hbmlmZXN0KTtcclxuICAgIGNvbnN0IGdhdGV3YXkgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdHYXRld2F5JywgLi4uZ2F0ZXdheU1hbmlmZXN0KTtcclxuXHJcbiAgICBkZXN0aW5hdGlvblJ1bGUubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XHJcbiAgICBkZXN0aW5hdGlvblJ1bGUubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMik7XHJcbiAgICB2aXJ0dWFsU2VydmljZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYxKTtcclxuICAgIHZpcnR1YWxTZXJ2aWNlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xyXG4gICAgZ2F0ZXdheS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYxKTtcclxuICAgIGdhdGV3YXkubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMik7XHJcbiAgfVxyXG59XHJcbiJdfQ==