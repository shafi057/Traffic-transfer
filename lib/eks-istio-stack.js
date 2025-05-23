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
        const istioFiles = ['istio-base.yaml', 'istiod.yaml', 'istio-ingress.yaml'];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWlzdGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLWlzdGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUFnRDtBQUNoRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QixnRkFBb0U7QUFFcEUsTUFBYSxhQUFjLFNBQVEsbUJBQUs7SUFDdEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtTQUMxQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsZ0JBQWdCLENBQ3hCLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsd0JBQXdCLENBQUMsQ0FDckUsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksMENBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsV0FBVyxFQUFDLFlBQVk7WUFDeEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO1lBQ3BDLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVk7U0FDYixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQzFELFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUU7U0FDckMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDN0IsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUMzRSxDQUFDO1FBRUYsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRTtZQUM3QyxRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLE1BQU0sRUFBRSxDQUFDLHNCQUFzQixFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQztTQUNuRSxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFO1lBQzNELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUU7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUU7WUFDekQsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtTQUMzQixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDN0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUU1RSxNQUFNLFFBQVEsR0FBRztZQUNmLHVCQUF1QjtZQUN2QixzQkFBc0I7WUFDdEIsY0FBYztZQUNkLGNBQWM7WUFDZCxjQUFjO1NBQ2YsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBVyxFQUFFLEtBQWUsRUFBRSxFQUFFLENBQ3JELEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDbkIsSUFBSTthQUNELGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7YUFDakUsR0FBRyxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDL0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUNuQixDQUFDO1FBRUosTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMzRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTNELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxjQUFjLENBQUMsQ0FBQztRQUMxRSxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUU1QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FDRjtBQWhGRCxzQ0FnRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBla3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgeWFtbCBmcm9tICd5YW1sJztcbmltcG9ydCB7IEt1YmVjdGxWMjhMYXllciB9IGZyb20gJ0Bhd3MtY2RrL2xhbWJkYS1sYXllci1rdWJlY3RsLXYyOCc7XG5cbmV4cG9ydCBjbGFzcyBFa3NJc3Rpb1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBhZG1pblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0Vrc0FkbWluUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5BY2NvdW50Um9vdFByaW5jaXBhbCgpLFxuICAgIH0pO1xuXG4gICAgYWRtaW5Sb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU0NsdXN0ZXJQb2xpY3knKVxuICAgICk7XG5cbiAgICBjb25zdCBrdWJlY3RsTGF5ZXIgPSBuZXcgS3ViZWN0bFYyOExheWVyKHRoaXMsICdLdWJlY3RsTGF5ZXInKTtcblxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0Vrc0NsdXN0ZXInLCB7XG4gICAgICBjbHVzdGVyTmFtZTonRWtzQ2x1c3RlcicsXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjgsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsXG4gICAgICBtYXN0ZXJzUm9sZTogYWRtaW5Sb2xlLFxuICAgICAga3ViZWN0bExheWVyLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgbm9kZWdyb3VwID0gY2x1c3Rlci5hZGROb2RlZ3JvdXBDYXBhY2l0eSgnTm9kZUdyb3VwJywge1xuICAgICAgZGVzaXJlZFNpemU6IDIsXG4gICAgICBpbnN0YW5jZVR5cGVzOiBbbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ3QzLm1lZGl1bScpXSxcbiAgICAgIHJlbW90ZUFjY2VzczogeyBzc2hLZXlOYW1lOiAnZGVtbycgfSxcbiAgICB9KTtcblxuICAgIG5vZGVncm91cC5yb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvblNTTU1hbmFnZWRJbnN0YW5jZUNvcmUnKVxuICAgICk7XG5cbiAgICBjbHVzdGVyLmF3c0F1dGguYWRkUm9sZU1hcHBpbmcobm9kZWdyb3VwLnJvbGUsIHtcbiAgICAgIHVzZXJuYW1lOiAnc3lzdGVtOm5vZGU6e3tFQzJQcml2YXRlRE5TTmFtZX19JyxcbiAgICAgIGdyb3VwczogWydzeXN0ZW06Ym9vdHN0cmFwcGVycycsICdzeXN0ZW06bm9kZXMnLCAnc3lzdGVtOm1hc3RlcnMnXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlzdGlvTmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnSXN0aW9OYW1lc3BhY2UnLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnaXN0aW8tc3lzdGVtJyB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVtb05hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RlbW9OYW1lc3BhY2UnLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnZGVtbycgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IG1hbmlmZXN0c0RpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdtYW5pZmVzdHMnKTtcbiAgICBjb25zdCBpc3Rpb0RpciA9IHBhdGguam9pbihtYW5pZmVzdHNEaXIsICdpc3RpbycpO1xuXG4gICAgY29uc3QgaXN0aW9GaWxlcyA9IFsnaXN0aW8tYmFzZS55YW1sJywgJ2lzdGlvZC55YW1sJywgJ2lzdGlvLWluZ3Jlc3MueWFtbCddO1xuXG4gICAgY29uc3QgYXBwRmlsZXMgPSBbXG4gICAgICAnZGVzdGluYXRpb24tcnVsZS55YW1sJyxcbiAgICAgICd2aXJ0dWFsLXNlcnZpY2UueWFtbCcsXG4gICAgICAnZ2F0ZXdheS55YW1sJyxcbiAgICAgICdkZW1vLXYxLnlhbWwnLFxuICAgICAgJ2RlbW8tdjIueWFtbCdcbiAgICBdO1xuXG4gICAgY29uc3QgbG9hZFJlc291cmNlcyA9IChkaXI6IHN0cmluZywgZmlsZXM6IHN0cmluZ1tdKSA9PlxuICAgICAgZmlsZXMuZmxhdE1hcChmaWxlID0+XG4gICAgICAgIHlhbWxcbiAgICAgICAgICAucGFyc2VBbGxEb2N1bWVudHMoZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihkaXIsIGZpbGUpLCAndXRmLTgnKSlcbiAgICAgICAgICAubWFwKChkb2M6IGFueSkgPT4gZG9jLnRvSlNPTigpKVxuICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICk7XG5cbiAgICBjb25zdCBpc3Rpb1Jlc291cmNlcyA9IGxvYWRSZXNvdXJjZXMoaXN0aW9EaXIsIGlzdGlvRmlsZXMpO1xuICAgIGNvbnN0IGFwcFJlc291cmNlcyA9IGxvYWRSZXNvdXJjZXMobWFuaWZlc3RzRGlyLCBhcHBGaWxlcyk7XG5cbiAgICBjb25zdCBhbGxJc3RpbyA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0lzdGlvUmVzb3VyY2VzJywgLi4uaXN0aW9SZXNvdXJjZXMpO1xuICAgIGFsbElzdGlvLm5vZGUuYWRkRGVwZW5kZW5jeShpc3Rpb05hbWVzcGFjZSk7XG5cbiAgICBjb25zdCBhbGxBcHAgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdBcHBSZXNvdXJjZXMnLCAuLi5hcHBSZXNvdXJjZXMpO1xuICAgIGFsbEFwcC5ub2RlLmFkZERlcGVuZGVuY3koYWxsSXN0aW8pO1xuICAgIGFsbEFwcC5ub2RlLmFkZERlcGVuZGVuY3koZGVtb05hbWVzcGFjZSk7XG4gIH1cbn1cbiJdfQ==