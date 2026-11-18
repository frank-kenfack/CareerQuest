import { useEffect, useState } from "react";

interface HealthStatusPayload {
  status: string;
  service: string;
  database: string;
  database_engine?: string;
  registered_students_count?: number;
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

  const formatHealthBadge = (healthPayload: HealthStatusPayload) => {
    if (healthPayload.database_engine) {
      return `API active (${healthPayload.database} : ${healthPayload.database_engine})`;
    }
    return `API active (${healthPayload.database})`;
  };

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
            className="rounded-full border border-emerald-500/40 bg-emerald-950/50 px-3 py-1 text-xs text-emerald-300"
          >
            {backendHealth
              ? formatHealthBadge(backendHealth)
              : connectionFailed
                ? "API hors ligne"
                : "Vérification de l'API..."}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Tableau de bord du joueur
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Accomplissez des quêtes, validez des compétences techniques et faites évoluer votre avatar.
              </p>
            </div>
            <span className="rounded-md border border-indigo-500/40 bg-indigo-950/50 px-3 py-1 text-xs font-medium text-indigo-300">
              Étape 2.1 active (Authentification JWT & Profil Avatar)
            </span>
          </div>
          {backendHealth && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Conteneur Frontend</p>
                <p className="mt-1 text-sm font-medium text-indigo-300">React + Nginx (port 3000)</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Conteneur Backend</p>
                <p className="mt-1 text-sm font-medium text-indigo-300">{backendHealth.service} ({backendHealth.status})</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Base PostgreSQL 16</p>
                <p className="mt-1 text-sm font-medium text-emerald-300">
                  Tables School, StudentProfile, Avatar ({backendHealth.database})
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Authentification JWT</p>
                <p className="mt-1 text-sm font-medium text-emerald-300">
                  /api/auth/register, login, refresh, me
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
