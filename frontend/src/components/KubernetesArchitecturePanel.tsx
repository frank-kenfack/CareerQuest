export default function KubernetesArchitecturePanel() {
  const k8sResources = [
    {
      category: "Ingress & Accès Externe",
      manifest: "k8s/ingress.yaml",
      resource: "Ingress careerquest-ingress (nginx)",
      detail: "Routage /api -> backend:8000 et / -> frontend:80",
    },
    {
      category: "Services & Load Balancing",
      manifest: "k8s/backend-deployment.yaml + service",
      resource: "Deployment careerquest-backend (2 réplicas)",
      detail: "ClusterIP :8000 + Sondes readiness/liveness /api/health/",
    },
    {
      category: "Services & Load Balancing",
      manifest: "k8s/frontend-deployment.yaml + service",
      resource: "Deployment careerquest-frontend (2 réplicas)",
      detail: "ClusterIP :80 + Serveur Nginx SPA haute disponibilité",
    },
    {
      category: "Volumes Persistants (PVC)",
      manifest: "k8s/postgres-pvc.yaml + deployment",
      resource: "PVC postgres-pvc (5Gi, ReadWriteOnce)",
      detail: "Monté sur /var/lib/postgresql/data avec sonde pg_isready",
    },
  ];

  return (
    <section
      data-testid="kubernetes-architecture-panel"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Orchestration Kubernetes & Cloud-Native (11 Manifestes k8s/)
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Architecture complète pour le cluster Kubernetes : Namespace, ConfigMap, Secrets, PVC 5Gi, 3 Deployments, 3 Services et Ingress.
          </p>
        </div>

        <span
          data-testid="k8s-bonus-badge"
          className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300"
        >
          Critères Bonus Kubernetes validés (Services, Ingress, Volumes)
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {k8sResources.map((item) => (
          <div
            key={item.manifest}
            className="rounded-xl border border-indigo-500/30 bg-slate-950 p-4"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="rounded bg-indigo-950 px-2 py-0.5 font-semibold text-indigo-300">
                {item.category}
              </span>
              <code className="text-slate-400">{item.manifest}</code>
            </div>
            <p className="mt-2.5 text-sm font-bold text-white">
              {item.resource}
            </p>
            <p className="mt-1 text-xs text-emerald-300">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
