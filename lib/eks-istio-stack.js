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
        cluster.awsAuth.addRoleMapping(adminRole, {
            groups: ['system:masters']
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLGdGQUFvRTtBQUVwRSxNQUFhLGFBQWMsU0FBUSxtQkFBSztJQUN0QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDbkQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLG9CQUFvQixFQUFFO1NBQzFDLENBQUMsQ0FBQztRQUVILFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUVqRyxNQUFNLFlBQVksR0FBRyxJQUFJLDBDQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRS9ELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ2xELE9BQU8sRUFBRSxHQUFHLENBQUMsaUJBQWlCLENBQUMsS0FBSztZQUNwQyxlQUFlLEVBQUUsQ0FBQztZQUNsQixXQUFXLEVBQUUsU0FBUztZQUN0QixZQUFZLEVBQUUsWUFBWTtTQUMzQixDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUU7WUFDdEMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDM0IsQ0FBQyxDQUFBO1FBRUosTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFD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LEVBQUUsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsZUFBZSxDQUFDLENBQUM7UUFFbkUsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDeEMsQ0FBQztDQUNGO0FBNUZELHNDQTRGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBla3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xyXG5pbXBvcnQgeyBLdWJlY3RsVjI4TGF5ZXIgfSBmcm9tICdAYXdzLWNkay9sYW1iZGEtbGF5ZXIta3ViZWN0bC12MjgnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEVrc0lzdGlvU3RhY2sgZXh0ZW5kcyBTdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgY29uc3QgYWRtaW5Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdFa3NBZG1pblJvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5BY2NvdW50Um9vdFByaW5jaXBhbCgpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYWRtaW5Sb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NDbHVzdGVyUG9saWN5JykpO1xyXG5cclxuICAgIGNvbnN0IGt1YmVjdGxMYXllciA9IG5ldyBLdWJlY3RsVjI4TGF5ZXIodGhpcywgJ0t1YmVjdGxMYXllcicpO1xyXG5cclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0Vrc0NsdXN0ZXInLCB7XHJcbiAgICAgIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8yOCxcclxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAyLFxyXG4gICAgICBtYXN0ZXJzUm9sZTogYWRtaW5Sb2xlLFxyXG4gICAgICBrdWJlY3RsTGF5ZXI6IGt1YmVjdGxMYXllcixcclxuICAgIH0pO1xyXG5cclxuICAgIGNsdXN0ZXIuYXdzQXV0aC5hZGRSb2xlTWFwcGluZyhhZG1pblJvbGUsIHtcclxuICAgICAgICBncm91cHM6IFsnc3lzdGVtOm1hc3RlcnMnXVxyXG4gICAgICB9KVxyXG5cclxuICAgIGNvbnN0IGlzdGlvTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnSXN0aW9OYW1lc3BhY2UnLCB7XHJcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXHJcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxyXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnaXN0aW8tc3lzdGVtJyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXN0aW9CYXNlID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvQmFzZScsIHtcclxuICAgICAgY2hhcnQ6ICdiYXNlJyxcclxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXHJcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1iYXNlJyxcclxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzdGlvZCA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb2QnLCB7XHJcbiAgICAgIGNoYXJ0OiAnaXN0aW9kJyxcclxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXHJcbiAgICAgIHJlbGVhc2U6ICdpc3Rpb2QnLFxyXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxyXG4gICAgICB2YWx1ZXM6IHtcclxuICAgICAgICBnbG9iYWw6IHtcclxuICAgICAgICAgIGlzdGlvTmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXN0aW9JbmdyZXNzID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvSW5ncmVzcycsIHtcclxuICAgICAgY2hhcnQ6ICdnYXRld2F5JyxcclxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXHJcbiAgICAgIHJlbGVhc2U6ICdpc3Rpby1pbmdyZXNzJyxcclxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGlzdGlvQmFzZS5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9OYW1lc3BhY2UpO1xyXG4gICAgaXN0aW9kLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb0Jhc2UpO1xyXG4gICAgaXN0aW9JbmdyZXNzLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb2QpO1xyXG5cclxuICAgIGNvbnN0IG1hbmlmZXN0c1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnbWFuaWZlc3RzJyk7XHJcblxyXG4gICAgY29uc3QgbG9hZE1hbmlmZXN0ID0gKGZpbGVuYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4obWFuaWZlc3RzUGF0aCwgZmlsZW5hbWUpO1xyXG4gICAgICByZXR1cm4geWFtbC5sb2FkQWxsKGZzLnJlYWRGaWxlU3luYyhmdWxsUGF0aCwgJ3V0ZjgnKSkgYXMgUmVjb3JkPHN0cmluZywgYW55PltdO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBuYW1lc3BhY2VNYW5pZmVzdCA9IGxvYWRNYW5pZmVzdCgnbmFtZXNwYWNlLnlhbWwnKTtcclxuICAgIGNvbnN0IGRlbW9WMU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdkZW1vLXYxLnlhbWwnKTtcclxuICAgIGNvbnN0IGRlbW9WMk1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdkZW1vLXYyLnlhbWwnKTtcclxuICAgIGNvbnN0IGRlc3RpbmF0aW9uUnVsZU1hbmlmZXN0ID0gbG9hZE1hbmlmZXN0KCdkZXN0aW5hdGlvbi1ydWxlLnlhbWwnKTtcclxuICAgIGNvbnN0IHZpcnR1YWxTZXJ2aWNlTWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ3ZpcnR1YWwtc2VydmljZS55YW1sJyk7XHJcbiAgICBjb25zdCBnYXRld2F5TWFuaWZlc3QgPSBsb2FkTWFuaWZlc3QoJ2dhdGV3YXkueWFtbCcpO1xyXG5cclxuICAgIGNvbnN0IGRlbW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZW1vTmFtZXNwYWNlJywgLi4ubmFtZXNwYWNlTWFuaWZlc3QpO1xyXG5cclxuICAgIGNvbnN0IGRlbW9BcHBWMSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9BcHBWMScsIC4uLmRlbW9WMU1hbmlmZXN0KTtcclxuICAgIGNvbnN0IGRlbW9BcHBWMiA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9BcHBWMicsIC4uLmRlbW9WMk1hbmlmZXN0KTtcclxuXHJcbiAgICBkZW1vQXBwVjEubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9OYW1lc3BhY2UpO1xyXG4gICAgZGVtb0FwcFYyLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vTmFtZXNwYWNlKTtcclxuXHJcbiAgICBjb25zdCBkZXN0aW5hdGlvblJ1bGUgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEZXN0aW5hdGlvblJ1bGUnLCAuLi5kZXN0aW5hdGlvblJ1bGVNYW5pZmVzdCk7XHJcbiAgICBjb25zdCB2aXJ0dWFsU2VydmljZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ1ZpcnR1YWxTZXJ2aWNlJywgLi4udmlydHVhbFNlcnZpY2VNYW5pZmVzdCk7XHJcbiAgICBjb25zdCBnYXRld2F5ID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnR2F0ZXdheScsIC4uLmdhdGV3YXlNYW5pZmVzdCk7XHJcblxyXG4gICAgZGVzdGluYXRpb25SdWxlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjEpO1xyXG4gICAgZGVzdGluYXRpb25SdWxlLm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xyXG4gICAgdmlydHVhbFNlcnZpY2Uubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XHJcbiAgICB2aXJ0dWFsU2VydmljZS5ub2RlLmFkZERlcGVuZGVuY3koZGVtb0FwcFYyKTtcclxuICAgIGdhdGV3YXkubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9BcHBWMSk7XHJcbiAgICBnYXRld2F5Lm5vZGUuYWRkRGVwZW5kZW5jeShkZW1vQXBwVjIpO1xyXG4gIH1cclxufVxyXG4iXX0=