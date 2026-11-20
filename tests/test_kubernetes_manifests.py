from pathlib import Path
import unittest


K8S_DIR = Path(__file__).resolve().parent.parent / "k8s"


class KubernetesManifestsValidationTest(unittest.TestCase):
    def test_all_eleven_kubernetes_manifests_exist(self):
        expected_manifest_files = {
            "namespace.yaml",
            "configmap.yaml",
            "secrets.yaml",
            "postgres-pvc.yaml",
            "postgres-deployment.yaml",
            "postgres-service.yaml",
            "backend-deployment.yaml",
            "backend-service.yaml",
            "frontend-deployment.yaml",
            "frontend-service.yaml",
            "ingress.yaml",
        }
        existing_manifest_files = {path.name for path in K8S_DIR.glob("*.yaml")}
        self.assertEqual(existing_manifest_files, expected_manifest_files)

    def test_persistent_volume_claim_and_postgres_mount_are_configured(self):
        pvc_content = (K8S_DIR / "postgres-pvc.yaml").read_text(encoding="utf-8")
        postgres_deployment = (K8S_DIR / "postgres-deployment.yaml").read_text(encoding="utf-8")

        self.assertIn("kind: PersistentVolumeClaim", pvc_content)
        self.assertIn("ReadWriteOnce", pvc_content)
        self.assertIn("storage: 5Gi", pvc_content)
        self.assertIn("claimName: postgres-pvc", postgres_deployment)
        self.assertIn("mountPath: /var/lib/postgresql/data", postgres_deployment)

    def test_services_load_balancing_and_health_probes_are_configured(self):
        backend_deployment = (K8S_DIR / "backend-deployment.yaml").read_text(encoding="utf-8")
        frontend_deployment = (K8S_DIR / "frontend-deployment.yaml").read_text(encoding="utf-8")
        backend_service = (K8S_DIR / "backend-service.yaml").read_text(encoding="utf-8")
        frontend_service = (K8S_DIR / "frontend-service.yaml").read_text(encoding="utf-8")

        self.assertIn("replicas: 2", backend_deployment)
        self.assertIn("readinessProbe:", backend_deployment)
        self.assertIn("livenessProbe:", backend_deployment)
        self.assertIn("path: /api/health/", backend_deployment)

        self.assertIn("replicas: 2", frontend_deployment)
        self.assertIn("readinessProbe:", frontend_deployment)
        self.assertIn("livenessProbe:", frontend_deployment)

        self.assertIn("kind: Service", backend_service)
        self.assertIn("port: 8000", backend_service)
        self.assertIn("kind: Service", frontend_service)
        self.assertIn("port: 80", frontend_service)

    def test_ingress_routes_external_traffic_to_frontend_and_backend(self):
        ingress_content = (K8S_DIR / "ingress.yaml").read_text(encoding="utf-8")

        self.assertIn("kind: Ingress", ingress_content)
        self.assertIn("ingressClassName: nginx", ingress_content)
        self.assertIn("path: /api", ingress_content)
        self.assertIn("name: backend", ingress_content)
        self.assertIn("number: 8000", ingress_content)
        self.assertIn("path: /", ingress_content)
        self.assertIn("name: frontend", ingress_content)
        self.assertIn("number: 80", ingress_content)


if __name__ == "__main__":
    unittest.main()
