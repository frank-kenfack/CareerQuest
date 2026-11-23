import { AvatarVisualTier, StudentProfile } from "../types/careerquest";

interface AvatarCardProps {
  studentProfile: StudentProfile;
  onGainExperience?: (xpAmount: number) => void;
  isUpdatingXp?: boolean;
  lastEvolutionMessage?: string | null;
}

interface TierVisualStyle {
  borderClass: string;
  auraClass: string;
  badgeClass: string;
  emblemLabel: string;
  equipmentText: string;
  primaryStroke: string;
  accentFill: string;
}

const TIER_STYLES: Record<AvatarVisualTier, TierVisualStyle> = {
  novice: {
    borderClass: "border-emerald-500/40",
    auraClass: "from-emerald-950/60 via-slate-900 to-slate-900",
    badgeClass: "bg-emerald-950 text-emerald-300 border-emerald-500/40",
    emblemLabel: "Palier I",
    equipmentText: "Fondamentaux du développement & Git",
    primaryStroke: "#34d399",
    accentFill: "#065f46",
  },
  apprenti: {
    borderClass: "border-cyan-500/50",
    auraClass: "from-cyan-950/60 via-slate-900 to-slate-900",
    badgeClass: "bg-cyan-950 text-cyan-300 border-cyan-500/40",
    emblemLabel: "Palier II",
    equipmentText: "Conteneurisation & Intégration continue",
    primaryStroke: "#22d3ee",
    accentFill: "#155e75",
  },
  confirme: {
    borderClass: "border-indigo-500/60",
    auraClass: "from-indigo-950/60 via-slate-900 to-slate-900",
    badgeClass: "bg-indigo-950 text-indigo-300 border-indigo-500/40",
    emblemLabel: "Palier III",
    equipmentText: "Ingénierie Cloud & Architectures distribuées",
    primaryStroke: "#818cf8",
    accentFill: "#3730a3",
  },
  maitre: {
    borderClass: "border-amber-400/60",
    auraClass: "from-amber-950/50 via-slate-900 to-slate-900",
    badgeClass: "bg-amber-950 text-amber-300 border-amber-400/50",
    emblemLabel: "Palier IV",
    equipmentText: "Architecture Fullstack & Cloud-Native",
    primaryStroke: "#fbbf24",
    accentFill: "#78350f",
  },
};

export default function AvatarCard({
  studentProfile,
  onGainExperience,
  isUpdatingXp = false,
  lastEvolutionMessage = null,
}: AvatarCardProps) {
  const { avatar } = studentProfile;
  const tierStyle = TIER_STYLES[avatar.visual_tier] || TIER_STYLES.novice;

  return (
    <div
      data-testid="avatar-card"
      className={`rounded-xl border ${tierStyle.borderClass} bg-gradient-to-br ${tierStyle.auraClass} p-6 shadow-lg`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div
            data-testid={`avatar-emblem-${avatar.visual_tier}`}
            className={`relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border ${tierStyle.borderClass} bg-slate-950/90 p-3`}
          >
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full"
              aria-label={`Avatar ${avatar.title}`}
            >
              <polygon
                points="50,6 90,26 90,74 50,94 10,74 10,26"
                fill={tierStyle.accentFill}
                stroke={tierStyle.primaryStroke}
                strokeWidth="3.5"
              />
              <circle
                cx="50"
                cy="38"
                r="14"
                fill="#0f172a"
                stroke={tierStyle.primaryStroke}
                strokeWidth="3"
              />
              <path
                d="M28 76 C28 58, 72 58, 72 76"
                fill="#0f172a"
                stroke={tierStyle.primaryStroke}
                strokeWidth="3"
              />
              {avatar.visual_tier !== "novice" && (
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={tierStyle.primaryStroke}
                  strokeDasharray="6 4"
                  strokeWidth="1.5"
                />
              )}
              {avatar.visual_tier === "maitre" && (
                <polygon
                  points="36,20 43,12 50,18 57,12 64,20"
                  fill={tierStyle.primaryStroke}
                />
              )}
            </svg>
            <span className="absolute -bottom-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
              Niv. {avatar.level}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-white">
                {studentProfile.username}
              </h3>
              <span
                data-testid="avatar-tier-badge"
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${tierStyle.badgeClass}`}
              >
                {avatar.visual_tier}
              </span>
            </div>
            <p
              data-testid="avatar-title"
              className="mt-1 text-sm font-medium text-indigo-300"
            >
              {avatar.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {tierStyle.emblemLabel} ({tierStyle.equipmentText})
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
              {studentProfile.school && (
                <span className="rounded bg-slate-900/90 px-2 py-1">
                  École : {studentProfile.school.name} ({studentProfile.school.city})
                </span>
              )}
              {studentProfile.github_username && (
                <span className="rounded bg-slate-900/90 px-2 py-1">
                  GitHub : @{studentProfile.github_username}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-72">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">
              Expérience cumulée
            </span>
            <span
              data-testid="avatar-xp-value"
              className="font-bold text-emerald-300"
            >
              {avatar.experience_points} / {avatar.xp_for_next_level} XP
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-950 p-0.5">
            <div
              data-testid="avatar-xp-bar"
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${avatar.current_level_progress_percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-slate-400">
            Progression niveau {avatar.level} : {avatar.current_level_progress_percent}%
          </p>

          {onGainExperience && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={isUpdatingXp}
                onClick={() => onGainExperience(100)}
                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isUpdatingXp ? "Mise à jour..." : "+100 XP (Valider un entraînement)"}
              </button>
            </div>
          )}
        </div>
      </div>

      {lastEvolutionMessage && (
        <div
          data-testid="avatar-evolution-banner"
          className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-4 py-2 text-xs font-medium text-emerald-200"
        >
          {lastEvolutionMessage}
        </div>
      )}
    </div>
  );
}
