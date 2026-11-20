import { useCallback, useEffect, useState } from "react";
import AuthenticationPanel from "./components/AuthenticationPanel";
import AvatarCard from "./components/AvatarCard";
import SkillTreeBoard from "./components/SkillTreeBoard";
import {
  AvatarState,
  HealthStatusPayload,
  ProgressionTiersPayload,
  SkillNodeItem,
  StudentProfile,
} from "./types/careerquest";

interface QuestPreviewItem {
  id: number;
  code: string;
  title: string;
  quest_type: "project" | "training" | "certification";
  description: string;
  xp_reward: number;
  related_skill_name: string | null;
  student_status: "not_started" | "in_progress" | "completed";
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const ACCESS_TOKEN_STORAGE_KEY = "careerquest_access_token";

export default function App() {
  const [backendHealth, setBackendHealth] = useState<HealthStatusPayload | null>(null);
  const [progressionLadder, setProgressionLadder] = useState<ProgressionTiersPayload | null>(null);
  const [skillNodes, setSkillNodes] = useState<SkillNodeItem[]>([]);
  const [questsPreview, setQuestsPreview] = useState<QuestPreviewItem[]>([]);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  );
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  const [isUpdatingXp, setIsUpdatingXp] = useState(false);
  const [unlockingSkillId, setUnlockingSkillId] = useState<number | null>(null);
  const [lastEvolutionMessage, setLastEvolutionMessage] = useState<string | null>(null);

  const loadSkillTree = useCallback(async (token: string | null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/skills/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        return;
      }
      const skillsPayload = (await response.json()) as SkillNodeItem[];
      if (Array.isArray(skillsPayload)) {
        setSkillNodes(skillsPayload);
      }
    } catch {
      // Le catalogue est ignore en cas d'erreur reseau lors des tests isoles.
    }
  }, []);

  const loadQuestsCatalog = useCallback(async (token: string | null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quests/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        return;
      }
      const questsPayload = (await response.json()) as QuestPreviewItem[];
      if (Array.isArray(questsPayload)) {
        setQuestsPreview(questsPayload);
      }
    } catch {
      // Le catalogue des quetes est ignore lors des tests unitaires isoles.
    }
  }, []);

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

    fetch(`${API_BASE_URL}/avatar/progression-tiers/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<ProgressionTiersPayload>;
      })
      .then((tiersPayload) => {
        if (isMounted && Array.isArray(tiersPayload.tiers)) {
          setProgressionLadder(tiersPayload);
        }
      })
      .catch(() => {
        // Les paliers sont optionnels lors des tests unitaires isoles du composant d'en-tete.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    loadSkillTree(accessToken);
    loadQuestsCatalog(accessToken);
  }, [accessToken, loadSkillTree, loadQuestsCatalog]);

  useEffect(() => {
    if (!accessToken || currentStudent) {
      return;
    }

    let isMounted = true;
    fetch(`${API_BASE_URL}/auth/me/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Jeton expire");
        }
        return response.json() as Promise<StudentProfile>;
      })
      .then((profilePayload) => {
        if (isMounted && profilePayload.avatar) {
          setCurrentStudent(profilePayload);
        }
      })
      .catch(() => {
        if (isMounted) {
          localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
          setAccessToken(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, currentStudent]);

  const handleAuthenticated = (studentProfile: StudentProfile, token: string) => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    setAccessToken(token);
    setCurrentStudent(studentProfile);
    setLastEvolutionMessage(
      `Session ouverte pour ${studentProfile.username} (Avatar niveau ${studentProfile.avatar.level} : ${studentProfile.avatar.title}).`
    );
  };

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    setAccessToken(null);
    setCurrentStudent(null);
    setLastEvolutionMessage(null);
  };

  const handleGainExperience = async (xpAmount: number) => {
    if (!accessToken || !currentStudent) {
      return;
    }
    setIsUpdatingXp(true);
    try {
      const response = await fetch(`${API_BASE_URL}/avatar/award-xp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ earned_xp: xpAmount }),
      });
      if (!response.ok) {
        throw new Error("Impossible d'attribuer les points d'expérience.");
      }
      const awardPayload = (await response.json()) as {
        progression: {
          previous_level: number;
          new_level: number;
          leveled_up: boolean;
          tier_evolved: boolean;
          title: string;
        };
        avatar: AvatarState;
      };
      setCurrentStudent({
        ...currentStudent,
        avatar: awardPayload.avatar,
      });
      await loadSkillTree(accessToken);
      if (awardPayload.progression.tier_evolved) {
        setLastEvolutionMessage(
          `Évolution de palier atteinte : Niveau ${awardPayload.progression.new_level} (${awardPayload.progression.title}) !`
        );
      } else if (awardPayload.progression.leveled_up) {
        setLastEvolutionMessage(
          `Passage au niveau ${awardPayload.progression.new_level} (${awardPayload.progression.title}) !`
        );
      }
    } finally {
      setIsUpdatingXp(false);
    }
  };

  const handleUnlockSkill = async (skillId: number) => {
    if (!accessToken || !currentStudent) {
      return;
    }
    setUnlockingSkillId(skillId);
    try {
      const response = await fetch(`${API_BASE_URL}/skills/${skillId}/unlock/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setLastEvolutionMessage(responseBody.detail || "Impossible de débloquer cette compétence.");
        return;
      }

      const unlockedPayload = responseBody as {
        unlocked_skill: SkillNodeItem;
        progression: {
          new_level: number;
          leveled_up: boolean;
          tier_evolved: boolean;
          title: string;
        };
        avatar: AvatarState;
      };

      setCurrentStudent({
        ...currentStudent,
        avatar: unlockedPayload.avatar,
      });
      await loadSkillTree(accessToken);

      setLastEvolutionMessage(
        `Compétence « ${unlockedPayload.unlocked_skill.name} » débloquée (+${unlockedPayload.unlocked_skill.xp_reward} XP) : Avatar niveau ${unlockedPayload.avatar.level} (${unlockedPayload.avatar.title}) !`
      );
    } finally {
      setUnlockingSkillId(null);
    }
  };

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
          <div className="flex items-center gap-3">
            {currentStudent && (
              <button
                type="button"
                onClick={handleLogout}
                data-testid="logout-button"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                Déconnexion ({currentStudent.username})
              </button>
            )}
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
              Étape 3.1 active (API Système de Quêtes : Projets, Formations, Certifications)
            </span>
          </div>
        </section>

        {currentStudent ? (
          <AvatarCard
            studentProfile={currentStudent}
            onGainExperience={handleGainExperience}
            isUpdatingXp={isUpdatingXp}
            lastEvolutionMessage={lastEvolutionMessage}
          />
        ) : (
          <AuthenticationPanel
            apiBaseUrl={API_BASE_URL}
            onAuthenticated={handleAuthenticated}
          />
        )}

        {questsPreview.length > 0 && (
          <section
            data-testid="quests-catalog-preview"
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Catalogue Backend des Quêtes ({questsPreview.length} quêtes actives)
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Servi par /api/quests/, /api/quests/{"{id}"}/start/ et /api/quests/{"{id}"}/complete/
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {questsPreview.map((questItem) => (
                <div
                  key={questItem.code}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded bg-indigo-950 px-2 py-0.5 font-semibold uppercase text-indigo-300">
                      {questItem.quest_type}
                    </span>
                    <span className="font-bold text-emerald-400">
                      +{questItem.xp_reward} XP
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {questItem.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {questItem.description}
                  </p>
                  {questItem.related_skill_name && (
                    <p className="mt-2 text-xs text-indigo-300">
                      Compétence liée : {questItem.related_skill_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {skillNodes.length > 0 && (
          <SkillTreeBoard
            skills={skillNodes}
            isAuthenticated={Boolean(currentStudent)}
            unlockingSkillId={unlockingSkillId}
            onUnlockSkill={handleUnlockSkill}
          />
        )}

        {progressionLadder && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Paliers d'évolution de l'Avatar ({progressionLadder.xp_per_level} XP par niveau)
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Calculés par le moteur Backend (/api/avatar/progression-tiers/ et /api/avatar/award-xp/)
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {progressionLadder.tiers.map((tierItem) => {
                const isCurrentTier =
                  currentStudent?.avatar.visual_tier === tierItem.visual_tier;
                return (
                  <div
                    key={tierItem.visual_tier}
                    className={`rounded-lg border p-4 ${
                      isCurrentTier
                        ? "border-emerald-400 bg-emerald-950/30"
                        : "border-indigo-500/30 bg-slate-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-indigo-950 px-2 py-0.5 text-xs font-semibold uppercase text-indigo-300">
                        {tierItem.visual_tier}
                      </span>
                      <span className="text-xs text-slate-400">
                        Niveau {tierItem.min_level}+
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {tierItem.title}
                    </p>
                    <p className="mt-1 text-xs text-emerald-400">
                      À partir de {tierItem.min_xp} XP
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
