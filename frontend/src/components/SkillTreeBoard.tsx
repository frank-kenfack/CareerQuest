import { useState } from "react";
import { SkillCategory, SkillNodeItem } from "../types/careerquest";

interface SkillTreeBoardProps {
  skills: SkillNodeItem[];
  isAuthenticated: boolean;
  unlockingSkillId: number | null;
  onUnlockSkill: (skillId: number) => void;
}

interface BranchMetadata {
  key: SkillCategory;
  label: string;
  subtitle: string;
  headerBadgeClass: string;
}

const SKILL_BRANCHES: BranchMetadata[] = [
  {
    key: "frontend",
    label: "Branche Frontend",
    subtitle: "Interfaces React, TypeScript & Architecture SPA",
    headerBadgeClass: "bg-sky-950 text-sky-300 border-sky-500/40",
  },
  {
    key: "backend",
    label: "Branche Backend",
    subtitle: "API REST Django, Sécurité JWT & PostgreSQL",
    headerBadgeClass: "bg-indigo-950 text-indigo-300 border-indigo-500/40",
  },
  {
    key: "devops",
    label: "Branche DevOps",
    subtitle: "Conteneurs Docker & Automatisation CI/CD",
    headerBadgeClass: "bg-cyan-950 text-cyan-300 border-cyan-500/40",
  },
  {
    key: "cloud",
    label: "Branche Cloud",
    subtitle: "Réseaux Nginx, Orchestration Kubernetes & Ingress",
    headerBadgeClass: "bg-violet-950 text-violet-300 border-violet-500/40",
  },
];

export default function SkillTreeBoard({
  skills,
  isAuthenticated,
  unlockingSkillId,
  onUnlockSkill,
}: SkillTreeBoardProps) {
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | "all">("all");
  const [inspectedSkillCode, setInspectedSkillCode] = useState<string | null>(
    skills[0]?.code ?? null
  );

  const unlockedCount = skills.filter((node) => node.is_unlocked).length;
  const visibleBranches =
    selectedCategory === "all"
      ? SKILL_BRANCHES
      : SKILL_BRANCHES.filter((branch) => branch.key === selectedCategory);

  const inspectedSkill =
    skills.find((node) => node.code === inspectedSkillCode) || skills[0] || null;

  const getSkillStatusBadge = (skillNode: SkillNodeItem) => {
    if (skillNode.is_unlocked) {
      return {
        label: "ACQUIS",
        cardClass: "border-emerald-500/60 bg-emerald-950/25",
        badgeClass: "border-emerald-500/50 bg-emerald-950 text-emerald-300",
      };
    }
    if (skillNode.is_available) {
      return {
        label: "DISPONIBLE",
        cardClass: "border-indigo-500/60 bg-slate-950 hover:border-indigo-400",
        badgeClass: "border-indigo-500/50 bg-indigo-950 text-indigo-300",
      };
    }
    return {
      label: "VERROUILLÉ",
      cardClass: "border-slate-800 bg-slate-950/60 opacity-75",
      badgeClass: "border-slate-700 bg-slate-900 text-slate-400",
    };
  };

  return (
    <section
      data-testid="skill-tree-board"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Arbre de Compétences Interactif
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Débloquez les compétences racines pour ouvrir les spécialisations avancées et faire évoluer votre avatar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            data-testid="skill-tree-mastery-counter"
            className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300"
          >
            {unlockedCount} / {skills.length} compétences acquises
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="filter-branch-all"
          onClick={() => setSelectedCategory("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            selectedCategory === "all"
              ? "bg-indigo-600 text-white"
              : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
          }`}
        >
          Toutes les branches ({skills.length})
        </button>
        {SKILL_BRANCHES.map((branch) => {
          const branchCount = skills.filter((node) => node.category === branch.key).length;
          return (
            <button
              key={branch.key}
              type="button"
              data-testid={`filter-branch-${branch.key}`}
              onClick={() => setSelectedCategory(branch.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                selectedCategory === branch.key
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              {branch.label} ({branchCount})
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {visibleBranches.map((branch) => {
          const branchNodes = skills.filter((node) => node.category === branch.key);
          return (
            <div
              key={branch.key}
              data-testid={`skill-branch-${branch.key}`}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold uppercase ${branch.headerBadgeClass}`}
                  >
                    {branch.label}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">{branch.subtitle}</p>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {branchNodes.filter((n) => n.is_unlocked).length} / {branchNodes.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {branchNodes.map((skillNode, nodeIndex) => {
                  const statusStyle = getSkillStatusBadge(skillNode);
                  const isCurrentlyUnlocking = unlockingSkillId === skillNode.id;

                  return (
                    <div key={skillNode.code}>
                      {nodeIndex > 0 && (
                        <div className="my-1 flex items-center justify-center">
                          <div
                            className={`h-5 w-0.5 ${
                              skillNode.is_unlocked
                                ? "bg-emerald-500"
                                : skillNode.is_available
                                  ? "bg-indigo-500"
                                  : "bg-slate-700"
                            }`}
                          />
                        </div>
                      )}

                      <div
                        data-testid={`skill-node-${skillNode.code}`}
                        onClick={() => setInspectedSkillCode(skillNode.code)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all ${statusStyle.cardClass}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            data-testid={`skill-status-${skillNode.code}`}
                            className={`rounded border px-2 py-0.5 text-xs font-semibold ${statusStyle.badgeClass}`}
                          >
                            {statusStyle.label}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">
                              Niv. {skillNode.required_level} requis
                            </span>
                            <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-bold text-emerald-300">
                              +{skillNode.xp_reward} XP
                            </span>
                          </div>
                        </div>

                        <h4 className="mt-2 text-sm font-bold text-white">
                          {skillNode.name}
                        </h4>
                        <p className="mt-1 text-xs text-slate-300">
                          {skillNode.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                          <span className="text-xs text-slate-400">
                            {skillNode.parent_skill_name
                              ? `Prérequis : ${skillNode.parent_skill_name}`
                              : "Compétence racine"}
                          </span>

                          {skillNode.is_unlocked ? (
                            <span className="text-xs font-semibold text-emerald-400">
                              Maîtrisée
                            </span>
                          ) : skillNode.is_available ? (
                            isAuthenticated ? (
                              <button
                                type="button"
                                data-testid={`unlock-button-${skillNode.code}`}
                                disabled={isCurrentlyUnlocking}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onUnlockSkill(skillNode.id);
                                }}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                              >
                                {isCurrentlyUnlocking
                                  ? "Déblocage..."
                                  : `Débloquer (+${skillNode.xp_reward} XP)`}
                              </button>
                            ) : (
                              <span className="text-xs text-indigo-300">
                                Connectez-vous pour débloquer
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-500">
                              Débloquez le prérequis parent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {inspectedSkill && (
        <div
          data-testid="skill-inspector-panel"
          className="mt-6 rounded-xl border border-indigo-500/30 bg-slate-950 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase text-indigo-400">
                Détail du noeud sélectionné ({inspectedSkill.code})
              </span>
              <h4 className="mt-0.5 text-base font-bold text-white">
                {inspectedSkill.name}
              </h4>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300">
              Récompense : +{inspectedSkill.xp_reward} XP
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            {inspectedSkill.description}
          </p>
        </div>
      )}
    </section>
  );
}
