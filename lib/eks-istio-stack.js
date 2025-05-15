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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLGdGQUFvRTtBQUVwRSxNQUFhLGFBQWMsU0FBUSxtQkFBSztJQUN0QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDakcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBRXBHLE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVksRUFBRSxZQUFZO1NBQzNCLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FB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QixFQUFFLEdBQUcsc0JBQXNCLENBQUMsQ0FBQztRQUN4RixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLGVBQWUsQ0FBQyxDQUFDO1FBRW5FLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRjtBQTFGRCxzQ0EwRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZWtzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgeWFtbCBmcm9tICdqcy15YW1sJztcclxuaW1wb3J0IHsgS3ViZWN0bFYyOExheWVyIH0gZnJvbSAnQGF3cy1jZGsvbGFtYmRhLWxheWVyLWt1YmVjdGwtdjI4JztcclxuXHJcbmV4cG9ydCBjbGFzcyBFa3NJc3Rpb1N0YWNrIGV4dGVuZHMgU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIElBTSBSb2xlIGZvciBFS1MgQWRtaW5cclxuICAgIGNvbnN0IGFkbWluUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRWtzQWRtaW5Sb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQWNjb3VudFJvb3RQcmluY2lwYWwoKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFkbWluUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTQ2x1c3RlclBvbGljeScpKTtcclxuICAgIGFkbWluUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTV29ya2VyTm9kZVBvbGljeScpKTtcclxuXHJcbiAgICBjb25zdCBrdWJlY3RsTGF5ZXIgPSBuZXcgS3ViZWN0bFYyOExheWVyKHRoaXMsICdLdWJlY3RsTGF5ZXInKTtcclxuXHJcbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVrcy5DbHVzdGVyKHRoaXMsICdFa3NDbHVzdGVyJywge1xyXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjgsXHJcbiAgICAgIGRlZmF1bHRDYXBhY2l0eTogMixcclxuICAgICAgbWFzdGVyc1JvbGU6IGFkbWluUm9sZSxcclxuICAgICAga3ViZWN0bExheWVyOiBrdWJlY3RsTGF5ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBpc3Rpb05hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0lzdGlvTmFtZXNwYWNlJywge1xyXG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxyXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcclxuICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ2lzdGlvLXN5c3RlbScgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzdGlvQmFzZSA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0Jhc2UnLCB7XHJcbiAgICAgIGNoYXJ0OiAnYmFzZScsXHJcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxyXG4gICAgICByZWxlYXNlOiAnaXN0aW8tYmFzZScsXHJcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBpc3Rpb2QgPSBjbHVzdGVyLmFkZEhlbG1DaGFydCgnSXN0aW9kJywge1xyXG4gICAgICBjaGFydDogJ2lzdGlvZCcsXHJcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxyXG4gICAgICByZWxlYXNlOiAnaXN0aW9kJyxcclxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcclxuICAgICAgdmFsdWVzOiB7XHJcbiAgICAgICAgZ2xvYmFsOiB7XHJcbiAgICAgICAgICBpc3Rpb05hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzdGlvSW5ncmVzcyA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0luZ3Jlc3MnLCB7XHJcbiAgICAgIGNoYXJ0OiAnZ2F0ZXdheScsXHJcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxyXG4gICAgICByZWxlYXNlOiAnaXN0aW8taW5ncmVzcycsXHJcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBpc3Rpb0Jhc2Uubm9kZS5hZGREZXBlbmRlbmN5KGlzdGlvTmFtZXNwYWNlKTtcclxuICAgIGlzdGlvZC5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9CYXNlKTtcclxuICAgIGlzdGlvSW5ncmVzcy5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9kKTtcclxuXHJcbiAgICBjb25zdCBtYW5pZmVzdHNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ21hbmlmZXN0cycpO1xyXG5cclxuICAgIGNvbnN0IGxvYWRNYW5pZmVzdCA9IChmaWxlbmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKG1hbmlmZXN0c1BhdGgsIGZpbGVuYW1lKTtcclxuICAgICAgcmV0dXJuIHlhbWwubG9hZEFsbChmcy5yZWFkRmlsZVN5bmMoZnVsbFBhdGgsICd1dGY4JykpIGFzIFJlY29yZDxzdHJpbmcsIGFueT5bXTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgbmFtZXNwYWNlTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ25hbWVzcGFjZS55YW1sJyk7XHJcbiAgICBjb25zdCBkZW1vVjFNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZGVtby12MS55YW1sJyk7XHJcbiAgICBjb25zdCBkZW1vVjJNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZGVtby12Mi55YW1sJyk7XHJcbiAgICBjb25zdCBkZXN0aW5hdGlvblJ1bGVNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnZGVzdGluYXRpb24tcnVsZS55YW1sJyk7XHJcbiAgICBjb25zdCB2aXJ0dWFsU2VydmljZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCd2aXJ0dWFsLXNlcnZpY2UueWFtbCcpO1xyXG4gICAgY29uc3QgZ2F0ZXdheU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdnYXRld2F5LnlhbWwnKTtcclxuXHJcbiAgICBjb25zdCBkZW1vTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb05hbWVzcGFjZScsIC4uLm5hbWVzcGFjZU1hbmlmZXN0KTtcclxuXHJcbiAgICBjb25zdCBkZW1vQXBwVjEgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vQXBwVjEnLCAuLi5kZW1vVjFNYW5pZmVzdCk7XHJcbiAgICBjb25zdCBkZW1vQXBwVjIgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vQXBwVjInLCAuLi5kZW1vVjJNYW5pZmVzdCk7XHJcblxyXG4gICAgZGVtb0FwcFYxLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vTmFtZXNwYWNlKTtcclxuICAgIGRlbW9BcHBWMi5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XHJcblxyXG4gICAgY29uc3QgZGVzdGluYXRpb25SdWxlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVzdGluYXRpb25SdWxlJywgLi4uZGVzdGluYXRpb25SdWxlTWFuaWZlc3QpO1xyXG4gICAgY29uc3QgdmlydHVhbFNlcnZpY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdWaXJ0dWFsU2VydmljZScsIC4uLnZpcnR1YWxTZXJ2aWNlTWFuaWZlc3QpO1xyXG4gICAgY29uc3QgZ2F0ZXdheSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0dhdGV3YXknLCAuLi5nYXRld2F5TWFuaWZlc3QpO1xyXG5cclxuICAgIGRlc3RpbmF0aW9uUnVsZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYxKTtcclxuICAgIGRlc3RpbmF0aW9uUnVsZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYyKTtcclxuICAgIHZpcnR1YWxTZXJ2aWNlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjEpO1xyXG4gICAgdmlydHVhbFNlcnZpY2Uubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMik7XHJcbiAgICBnYXRld2F5Lm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjEpO1xyXG4gICAgZ2F0ZXdheS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYyKTtcclxuICB9XHJcbn1cclxuIl19