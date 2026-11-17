import { useEffect, useState } from "react";

interface HealthStatusPayload {
  status: string;
  service: string;
  database: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export default function App() {
  const [backendHealth, setBackendHealth] = useState<HealthStatusPayload | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch(`${API_BASE_URL}/health/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<HealthStatusPayload>;
      })
      .then((healthPayload) => {
        if (isMounted) {
          setBackendHealth(healthPayload);
        }
      })
      .catch(() => {
        if (isMounted) {
          setConnectionFailed(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-indigo-400">
              CareerQuest
            </h1>
            <p className="text-xs text-slate-400">
              Progression professionnelle et arbre de compétences
            </p>
          </div>
          <div
            data-testid="backend-status"
            className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs"
          >
            {backendHealth
              ? `API active (${backendHealth.database})`
              : connectionFailed
                ? "API hors ligne"
                : "Vérification de l'API..."}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">
            Tableau de bord du joueur
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Accomplissez des quêtes, validez des compétences techniques et faites évoluer votre avatar.
          </p>
        </section>
      </main>
    </div>
  );
}
