import { useState } from "react";
import { QuestCategory, QuestItem } from "../types/careerquest";

interface QuestLogPanelProps {
  quests: QuestItem[];
  isAuthenticated: boolean;
  activeQuestId: number | null;
  onStartQuest: (questId: number) => void;
  onCompleteQuest: (questId: number, proofUrl: string) => void;
}

const QUEST_TYPE_LABELS: Record<QuestCategory, { label: string; badgeClass: string }> = {
  project: {
    label: "PROJET",
    badgeClass: "border-indigo-500/40 bg-indigo-950 text-indigo-300",
  },
  training: {
    label: "FORMATION",
    badgeClass: "border-cyan-500/40 bg-cyan-950 text-cyan-300",
  },
  certification: {
    label: "CERTIFICATION",
    badgeClass: "border-amber-500/40 bg-amber-950 text-amber-300",
  },
};

export default function QuestLogPanel({
  quests,
  isAuthenticated,
  activeQuestId,
  onStartQuest,
  onCompleteQuest,
}: QuestLogPanelProps) {
  const [selectedType, setSelectedType] = useState<QuestCategory | "all">("all");
  const [proofUrlsByQuestId, setProofUrlsByQuestId] = useState<Record<number, string>>({});

  const completedQuestsCount = quests.filter((q) => q.student_status === "completed").length;
  const completionRatioPercent =
    quests.length > 0 ? Math.round((completedQuestsCount / quests.length) * 100) : 0;

  const filteredQuests =
    selectedType === "all"
      ? quests
      : quests.filter((q) => q.quest_type === selectedType);

  const getStatusPresentation = (questItem: QuestItem) => {
    if (questItem.student_status === "completed") {
      return {
        label: "VALIDÉE",
        cardClass: "border-emerald-500/60 bg-emerald-950/20",
        statusBadgeClass: "border-emerald-500/50 bg-emerald-950 text-emerald-300",
      };
    }
    if (questItem.student_status === "in_progress") {
      return {
        label: "EN COURS",
        cardClass: "border-indigo-500/60 bg-slate-950",
        statusBadgeClass: "border-indigo-500/50 bg-indigo-950 text-indigo-300",
      };
    }
    return {
      label: "À DÉMARRER",
      cardClass: "border-slate-800 bg-slate-950",
      statusBadgeClass: "border-slate-700 bg-slate-900 text-slate-400",
    };
  };

  return (
    <section
      data-testid="quest-log-panel"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Journal de Quêtes (Projets, Formations & Certifications)
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Démarrez une quête, soumettez un lien de preuve (dépôt Git ou certificat) et validez-la pour gagner de l'expérience.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            data-testid="quest-completion-counter"
            className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300"
          >
            {completedQuestsCount} / {quests.length} quêtes accomplies ({completionRatioPercent}%)
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="filter-quest-all"
          onClick={() => setSelectedType("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            selectedType === "all"
              ? "bg-indigo-600 text-white"
              : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
          }`}
        >
          Toutes les quêtes ({quests.length})
        </button>
        {(["project", "training", "certification"] as QuestCategory[]).map((typeKey) => {
          const count = quests.filter((q) => q.quest_type === typeKey).length;
          return (
            <button
              key={typeKey}
              type="button"
              data-testid={`filter-quest-${typeKey}`}
              onClick={() => setSelectedType(typeKey)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                selectedType === typeKey
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              {QUEST_TYPE_LABELS[typeKey].label} ({count})
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredQuests.map((questItem) => {
          const typeMeta = QUEST_TYPE_LABELS[questItem.quest_type];
          const statusStyle = getStatusPresentation(questItem);
          const isBusy = activeQuestId === questItem.id;
          const currentProofValue =
            proofUrlsByQuestId[questItem.id] ?? questItem.proof_url ?? "";

          return (
            <div
              key={questItem.code}
              data-testid={`quest-card-${questItem.code}`}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${statusStyle.cardClass}`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-semibold ${typeMeta.badgeClass}`}
                    >
                      {typeMeta.label}
                    </span>
                    <span
                      data-testid={`quest-status-${questItem.code}`}
                      className={`rounded border px-2 py-0.5 text-xs font-semibold ${statusStyle.statusBadgeClass}`}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                  <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    +{questItem.xp_reward} XP
                  </span>
                </div>

                <h4 className="mt-3 text-sm font-bold text-white">
                  {questItem.title}
                </h4>
                <p className="mt-1 text-xs text-slate-300">
                  {questItem.description}
                </p>

                {questItem.related_skill_name && (
                  <p className="mt-2 text-xs text-indigo-300">
                    Compétence associée : {questItem.related_skill_name}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-3">
                {questItem.student_status === "completed" ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-emerald-400">
                      Quête validée (+{questItem.xp_reward} XP attribués)
                    </span>
                    {questItem.proof_url && (
                      <a
                        href={questItem.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-300 underline hover:text-indigo-200"
                      >
                        Voir la preuve
                      </a>
                    )}
                  </div>
                ) : isAuthenticated ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      data-testid={`proof-input-${questItem.code}`}
                      value={currentProofValue}
                      onChange={(event) =>
                        setProofUrlsByQuestId({
                          ...proofUrlsByQuestId,
                          [questItem.id]: event.target.value,
                        })
                      }
                      placeholder="https://github.com/frank-kenfack/CareerQuest"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      {questItem.student_status === "not_started" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          data-testid={`start-quest-${questItem.code}`}
                          onClick={() => onStartQuest(questItem.id)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                        >
                          Démarrer
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        data-testid={`complete-quest-${questItem.code}`}
                        onClick={() => onCompleteQuest(questItem.id, currentProofValue)}
                        className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {isBusy
                          ? "Validation..."
                          : `Valider la quête (+${questItem.xp_reward} XP)`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    Connectez-vous pour démarrer ou valider cette quête.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
