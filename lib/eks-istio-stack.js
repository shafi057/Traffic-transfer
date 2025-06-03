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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyx5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLDZCQUE2QjtBQUM3QixnRkFBb0U7QUFFcEUsTUFBYSxhQUFjLFNBQVEsbUJBQUs7SUFDdEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQ3hCLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsd0JBQXdCLENBQUMsQ0FDckUsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsV0FBVyxFQUFFLFlBQVk7WUFDekIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVk7U0FDYixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQzFELFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUMsSUFBSSxH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LE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNGO0FBckdELHNDQXFHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBla3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAneWFtbCc7XHJcbmltcG9ydCB7IEt1YmVjdGxWMjhMYXllciB9IGZyb20gJ0Bhd3MtY2RrL2xhbWJkYS1sYXllci1rdWJlY3RsLXYyOCc7XHJcblxyXG5leHBvcnQgY2xhc3MgRWtzSXN0aW9TdGFjayBleHRlbmRzIFN0YWNrIHtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCBhZG1pblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0Vrc0FkbWluUm9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkFjY291bnRSb290UHJpbmNpcGFsKCksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhZG1pblJvbGUuYWRkTWFuYWdlZFBvbGljeShcclxuICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NDbHVzdGVyUG9saWN5JylcclxuICAgICk7XHJcblxyXG4gICAgY29uc3Qga3ViZWN0bExheWVyID0gbmV3IEt1YmVjdGxWMjhMYXllcih0aGlzLCAnS3ViZWN0bExheWVyJyk7XHJcblxyXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnRWtzQ2x1c3RlcicsIHtcclxuICAgICAgY2x1c3Rlck5hbWU6ICdFa3NDbHVzdGVyJyxcclxuICAgICAgdmVyc2lvbjogZWtzLkt1YmVybmV0ZXNWZXJzaW9uLlYxXzI4LFxyXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsXHJcbiAgICAgIG1hc3RlcnNSb2xlOiBhZG1pblJvbGUsXHJcbiAgICAgIGt1YmVjdGxMYXllcixcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG5vZGVncm91cCA9IGNsdXN0ZXIuYWRkTm9kZWdyb3VwQ2FwYWNpdHkoJ05vZGVHcm91cCcsIHtcclxuICAgICAgZGVzaXJlZFNpemU6IDIsXHJcbiAgICAgIGluc3RhbmNlVHlwZXM6IFtuZXcgZWMyLkluc3RhbmNlVHlwZSgndDMubWVkaXVtJyldLFxyXG4gICAgICByZW1vdGVBY2Nlc3M6IHsgc3NoS2V5TmFtZTogJ2RlbW8nIH0sIFxyXG4gICAgfSk7XHJcblxyXG4gICAgbm9kZWdyb3VwLnJvbGUuYWRkTWFuYWdlZFBvbGljeShcclxuICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25TU01NYW5hZ2VkSW5zdGFuY2VDb3JlJylcclxuICAgICk7XHJcblxyXG4gICAgY2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKG5vZGVncm91cC5yb2xlLCB7XHJcbiAgICAgIHVzZXJuYW1lOiAnc3lzdGVtOm5vZGU6e3tFQzJQcml2YXRlRE5TTmFtZX19JyxcclxuICAgICAgZ3JvdXBzOiBbJ3N5c3RlbTpib290c3RyYXBwZXJzJywgJ3N5c3RlbTpub2RlcycsICdzeXN0ZW06bWFzdGVycyddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXN0aW9OYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdJc3Rpb05hbWVzcGFjZScsIHtcclxuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcclxuICAgICAga2luZDogJ05hbWVzcGFjZScsXHJcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdpc3Rpby1zeXN0ZW0nIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBkZW1vTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGVtb05hbWVzcGFjZScsIHtcclxuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcclxuICAgICAga2luZDogJ05hbWVzcGFjZScsXHJcbiAgICAgIG1ldGFkYXRhOiB7IG5hbWU6ICdkZW1vJyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXN0aW9CYXNlID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvQmFzZScsIHtcclxuICAgICAgY2hhcnQ6ICdiYXNlJyxcclxuICAgICAgcmVsZWFzZTogJ2lzdGlvLWJhc2UnLFxyXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9pc3Rpby1yZWxlYXNlLnN0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vY2hhcnRzJyxcclxuICAgICAgbmFtZXNwYWNlOiAnaXN0aW8tc3lzdGVtJyxcclxuICAgICAgY3JlYXRlTmFtZXNwYWNlOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXN0aW9kID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ0lzdGlvZCcsIHtcclxuICAgICAgY2hhcnQ6ICdpc3Rpb2QnLFxyXG4gICAgICByZWxlYXNlOiAnaXN0aW9kJyxcclxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vaXN0aW8tcmVsZWFzZS5zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2NoYXJ0cycsXHJcbiAgICAgIG5hbWVzcGFjZTogJ2lzdGlvLXN5c3RlbScsXHJcbiAgICB9KTtcclxuICAgIGlzdGlvZC5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9CYXNlKTtcclxuXHJcbiAgICBjb25zdCBpbmdyZXNzR2F0ZXdheSA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdJc3Rpb0luZ3Jlc3NHYXRld2F5Jywge1xyXG4gICAgICBjaGFydDogJ2dhdGV3YXknLFxyXG4gICAgICByZWxlYXNlOiAnaXN0aW8taW5ncmVzcycsXHJcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2lzdGlvLXJlbGVhc2Uuc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9jaGFydHMnLFxyXG4gICAgICBuYW1lc3BhY2U6ICdpc3Rpby1zeXN0ZW0nLFxyXG4gICAgICB2YWx1ZXM6IHtcclxuICAgICAgICBzZXJ2aWNlOiB7XHJcbiAgICAgICAgICB0eXBlOiAnTG9hZEJhbGFuY2VyJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICBpbmdyZXNzR2F0ZXdheS5ub2RlLmFkZERlcGVuZGVuY3koaXN0aW9kKTtcclxuXHJcbiAgICBjb25zdCBtYW5pZmVzdHNEaXIgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnbWFuaWZlc3RzJyk7XHJcbiAgICBjb25zdCBhcHBGaWxlcyA9IFtcclxuICAgICAgJ2Rlc3RpbmF0aW9uLXJ1bGUueWFtbCcsXHJcbiAgICAgICd2aXJ0dWFsLXNlcnZpY2UueWFtbCcsXHJcbiAgICAgICdnYXRld2F5LnlhbWwnLFxyXG4gICAgICAnZGVtby12MS55YW1sJyxcclxuICAgICAgJ2RlbW8tdjIueWFtbCcsXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IGxvYWRSZXNvdXJjZXMgPSAoZGlyOiBzdHJpbmcsIGZpbGVzOiBzdHJpbmdbXSkgPT5cclxuICAgICAgZmlsZXMuZmxhdE1hcChmaWxlID0+XHJcbiAgICAgICAgeWFtbFxyXG4gICAgICAgICAgLnBhcnNlQWxsRG9jdW1lbnRzKGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oZGlyLCBmaWxlKSwgJ3V0Zi04JykpXHJcbiAgICAgICAgICAubWFwKChkb2M6IGFueSkgPT4gZG9jLnRvSlNPTigpKVxyXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxyXG4gICAgICApO1xyXG5cclxuICAgIGNvbnN0IGFwcFJlc291cmNlcyA9IGxvYWRSZXNvdXJjZXMobWFuaWZlc3RzRGlyLCBhcHBGaWxlcyk7XHJcbiAgICBjb25zdCBhbGxBcHAgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdBcHBSZXNvdXJjZXMnLCAuLi5hcHBSZXNvdXJjZXMpO1xyXG4gICAgYWxsQXBwLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb05hbWVzcGFjZSk7XHJcbiAgICBhbGxBcHAubm9kZS5hZGREZXBlbmRlbmN5KGRlbW9OYW1lc3BhY2UpO1xyXG4gICAgYWxsQXBwLm5vZGUuYWRkRGVwZW5kZW5jeShpbmdyZXNzR2F0ZXdheSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==