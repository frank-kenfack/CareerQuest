import { FormEvent, useState } from "react";
import { ExternalAchievementItem } from "../types/careerquest";

interface LinkedinSyncPanelProps {
  initialLinkedinUrl: string;
  achievements: ExternalAchievementItem[];
  isSyncing: boolean;
  onSyncLinkedin: (
    linkedinProfileUrl: string,
    certificationTitle: string,
    certificationIssuer: string
  ) => void;
}

export default function LinkedinSyncPanel({
  initialLinkedinUrl,
  achievements,
  isSyncing,
  onSyncLinkedin,
}: LinkedinSyncPanelProps) {
  const [linkedinUrlInput, setLinkedinUrlInput] = useState(
    initialLinkedinUrl || "https://www.linkedin.com/in/frank-kenfack"
  );
  const [certificationTitleInput, setCertificationTitleInput] = useState(
    "Kubernetes & Cloud Native DevOps"
  );
  const [certificationIssuerInput, setCertificationIssuerInput] = useState(
    "Linux Foundation"
  );

  const linkedinAchievements = achievements.filter((item) => item.provider === "linkedin");
  const totalLinkedinXp = linkedinAchievements.reduce((sum, item) => sum + item.xp_awarded, 0);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!linkedinUrlInput.trim()) {
      return;
    }
    onSyncLinkedin(
      linkedinUrlInput.trim(),
      certificationTitleInput.trim(),
      certificationIssuerInput.trim()
    );
  };

  return (
    <section
      data-testid="linkedin-sync-panel"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Intégration Profil & Certifications LinkedIn
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Reliez votre profil professionnel LinkedIn et importez vos certifications pour débloquer des accomplissements de carrière.
          </p>
        </div>

        <span
          data-testid="linkedin-achievements-counter"
          className="rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-semibold text-sky-300"
        >
          {linkedinAchievements.length} accomplissements LinkedIn (+{totalLinkedinXp} XP)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="linkedin-url-input"
            className="block text-xs font-medium text-slate-300"
          >
            URL du profil LinkedIn
          </label>
          <input
            id="linkedin-url-input"
            data-testid="linkedin-url-input"
            type="url"
            required
            value={linkedinUrlInput}
            onChange={(event) => setLinkedinUrlInput(event.target.value)}
            placeholder="https://www.linkedin.com/in/frank-kenfack"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="linkedin-cert-title"
            className="block text-xs font-medium text-slate-300"
          >
            Certification LinkedIn à importer
          </label>
          <input
            id="linkedin-cert-title"
            data-testid="linkedin-cert-title-input"
            type="text"
            value={certificationTitleInput}
            onChange={(event) => setCertificationTitleInput(event.target.value)}
            placeholder="Kubernetes & Cloud Native DevOps"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="linkedin-cert-issuer"
            className="block text-xs font-medium text-slate-300"
          >
            Organisme émetteur
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="linkedin-cert-issuer"
              data-testid="linkedin-cert-issuer-input"
              type="text"
              value={certificationIssuerInput}
              onChange={(event) => setCertificationIssuerInput(event.target.value)}
              placeholder="Linux Foundation"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSyncing}
              data-testid="linkedin-sync-button"
              className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {isSyncing ? "Import..." : "Importer LinkedIn"}
            </button>
          </div>
        </div>
      </form>

      {linkedinAchievements.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {linkedinAchievements.map((achievementItem) => (
            <div
              key={achievementItem.external_key}
              data-testid={`linkedin-achievement-${achievementItem.external_key}`}
              className="flex items-center justify-between rounded-xl border border-sky-500/40 bg-sky-950/20 p-3.5"
            >
              <div>
                <span className="rounded bg-sky-950 px-2 py-0.5 text-[11px] font-semibold uppercase text-sky-300">
                  LINKEDIN
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
          Aucune certification LinkedIn importée pour le moment.
        </p>
      )}
    </section>
  );
}
