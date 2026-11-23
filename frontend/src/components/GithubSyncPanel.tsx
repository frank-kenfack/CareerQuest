import { FormEvent, useState } from "react";
import { ExternalAchievementItem } from "../types/careerquest";

interface GithubSyncPanelProps {
  initialGithubUsername: string;
  achievements: ExternalAchievementItem[];
  isSyncing: boolean;
  onSyncGithub: (githubUsername: string) => void;
}

export default function GithubSyncPanel({
  initialGithubUsername,
  achievements,
  isSyncing,
  onSyncGithub,
}: GithubSyncPanelProps) {
  const [githubUsernameInput, setGithubUsernameInput] = useState(
    initialGithubUsername || "frank-kenfack"
  );

  const githubAchievements = achievements.filter((item) => item.provider === "github");
  const totalGithubXp = githubAchievements.reduce((sum, item) => sum + item.xp_awarded, 0);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!githubUsernameInput.trim()) {
      return;
    }
    onSyncGithub(githubUsernameInput.trim());
  };

  return (
    <section
      data-testid="github-sync-panel"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            Compte GitHub
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Synchronisez vos dépôts publics pour valoriser vos projets techniques.
          </p>
        </div>

        <span
          data-testid="github-achievements-counter"
          className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300"
        >
          {githubAchievements.length} accomplissements GitHub (+{totalGithubXp} XP)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="github-sync-input" className="sr-only">
            Identifiant GitHub
          </label>
          <input
            id="github-sync-input"
            data-testid="github-sync-input"
            type="text"
            required
            value={githubUsernameInput}
            onChange={(event) => setGithubUsernameInput(event.target.value)}
            placeholder="ex. frank-kenfack"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSyncing}
          data-testid="github-sync-button"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSyncing ? "Synchronisation GitHub..." : "Synchroniser avec GitHub API"}
        </button>
      </form>

      {githubAchievements.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {githubAchievements.map((achievementItem) => (
            <div
              key={achievementItem.external_key}
              data-testid={`github-achievement-${achievementItem.external_key}`}
              className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5"
            >
              <div>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold uppercase text-indigo-300">
                  GITHUB
                </span>
                <p className="mt-1.5 text-sm font-semibold text-white">
                  {achievementItem.title}
                </p>
              </div>
              <span className="rounded-lg bg-emerald-950 px-2.5 py-1 text-xs font-bold text-emerald-300">
                +{achievementItem.xp_awarded} XP
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-400">
          Aucun accomplissement GitHub synchronisé pour le moment. Lancez la synchronisation ci-dessus.
        </p>
      )}
    </section>
  );
}
