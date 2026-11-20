import { useCallback, useEffect, useState } from "react";
import AuthenticationPanel from "./components/AuthenticationPanel";
import AvatarCard from "./components/AvatarCard";
import GithubSyncPanel from "./components/GithubSyncPanel";
import KubernetesArchitecturePanel from "./components/KubernetesArchitecturePanel";
import LeaderboardPanel from "./components/LeaderboardPanel";
import LinkedinSyncPanel from "./components/LinkedinSyncPanel";
import QuestLogPanel from "./components/QuestLogPanel";
import SkillTreeBoard from "./components/SkillTreeBoard";
import {
  AvatarState,
  ExternalAchievementItem,
  HealthStatusPayload,
  ProgressionTiersPayload,
  QuestItem,
  SchoolLeaderboardEntry,
  SkillNodeItem,
  StudentLeaderboardEntry,
  StudentProfile,
} from "./types/careerquest";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const ACCESS_TOKEN_STORAGE_KEY = "careerquest_access_token";

export default function App() {
  const [backendHealth, setBackendHealth] = useState<HealthStatusPayload | null>(null);
  const [progressionLadder, setProgressionLadder] = useState<ProgressionTiersPayload | null>(null);
  const [skillNodes, setSkillNodes] = useState<SkillNodeItem[]>([]);
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [externalAchievements, setExternalAchievements] = useState<ExternalAchievementItem[]>([]);
  const [studentLeaderboard, setStudentLeaderboard] = useState<StudentLeaderboardEntry[]>([]);
  const [schoolLeaderboard, setSchoolLeaderboard] = useState<SchoolLeaderboardEntry[]>([]);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  );
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  const [isUpdatingXp, setIsUpdatingXp] = useState(false);
  const [unlockingSkillId, setUnlockingSkillId] = useState<number | null>(null);
  const [activeQuestId, setActiveQuestId] = useState<number | null>(null);
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [isSyncingLinkedin, setIsSyncingLinkedin] = useState(false);
  const [lastEvolutionMessage, setLastEvolutionMessage] = useState<string | null>(null);

  const loadLeaderboards = useCallback(async () => {
    try {
      const [studentsResponse, schoolsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/leaderboard/students/`),
        fetch(`${API_BASE_URL}/leaderboard/schools/`),
      ]);
      if (studentsResponse.ok) {
        const studentsPayload = (await studentsResponse.json()) as StudentLeaderboardEntry[];
        if (Array.isArray(studentsPayload)) {
          setStudentLeaderboard(studentsPayload);
        }
      }
      if (schoolsResponse.ok) {
        const schoolsPayload = (await schoolsResponse.json()) as SchoolLeaderboardEntry[];
        if (Array.isArray(schoolsPayload)) {
          setSchoolLeaderboard(schoolsPayload);
        }
      }
    } catch {
      // Les classements sont ignores lors des tests unitaires isoles.
    }
  }, []);

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
      const questsPayload = (await response.json()) as QuestItem[];
      if (Array.isArray(questsPayload)) {
        setQuests(questsPayload);
      }
    } catch {
      // Le catalogue des quetes est ignore lors des tests unitaires isoles.
    }
  }, []);

  const loadExternalAchievements = useCallback(async (token: string | null) => {
    if (!token) {
      setExternalAchievements([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/integrations/achievements/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return;
      }
      const achievementsPayload = (await response.json()) as ExternalAchievementItem[];
      if (Array.isArray(achievementsPayload)) {
        setExternalAchievements(achievementsPayload);
      }
    } catch {
      // Les accomplissements externes sont ignores lors des tests unitaires isoles.
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
    loadExternalAchievements(accessToken);
    loadLeaderboards();
  }, [
    accessToken,
    loadSkillTree,
    loadQuestsCatalog,
    loadExternalAchievements,
    loadLeaderboards,
  ]);

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
    loadLeaderboards();
    setLastEvolutionMessage(
      `Session ouverte pour ${studentProfile.username} (Avatar niveau ${studentProfile.avatar.level} : ${studentProfile.avatar.title}).`
    );
  };

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    setAccessToken(null);
    setCurrentStudent(null);
    setExternalAchievements([]);
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
      await loadLeaderboards();
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
      await loadLeaderboards();

      setLastEvolutionMessage(
        `Compétence « ${unlockedPayload.unlocked_skill.name} » débloquée (+${unlockedPayload.unlocked_skill.xp_reward} XP) : Avatar niveau ${unlockedPayload.avatar.level} (${unlockedPayload.avatar.title}) !`
      );
    } finally {
      setUnlockingSkillId(null);
    }
  };

  const handleStartQuest = async (questId: number) => {
    if (!accessToken || !currentStudent) {
      return;
    }
    setActiveQuestId(questId);
    try {
      const response = await fetch(`${API_BASE_URL}/quests/${questId}/start/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setLastEvolutionMessage(responseBody.detail || "Impossible de démarrer cette quête.");
        return;
      }
      await loadQuestsCatalog(accessToken);
      setLastEvolutionMessage(`Quête « ${responseBody.quest.title} » démarrée.`);
    } finally {
      setActiveQuestId(null);
    }
  };

  const handleCompleteQuest = async (questId: number, proofUrl: string) => {
    if (!accessToken || !currentStudent) {
      return;
    }
    setActiveQuestId(questId);
    try {
      const response = await fetch(`${API_BASE_URL}/quests/${questId}/complete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ proof_url: proofUrl }),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setLastEvolutionMessage(responseBody.detail || "Impossible de valider cette quête.");
        return;
      }

      const completedPayload = responseBody as {
        quest: QuestItem;
        avatar: AvatarState;
      };

      setCurrentStudent({
        ...currentStudent,
        avatar: completedPayload.avatar,
      });
      await loadQuestsCatalog(accessToken);
      await loadSkillTree(accessToken);
      await loadLeaderboards();

      setLastEvolutionMessage(
        `Quête « ${completedPayload.quest.title} » validée (+${completedPayload.quest.xp_reward} XP) : Avatar niveau ${completedPayload.avatar.level} (${completedPayload.avatar.title}) !`
      );
    } finally {
      setActiveQuestId(null);
    }
  };

  const handleSyncGithub = async (githubUsername: string) => {
    if (!accessToken || !currentStudent) {
      return;
    }
    setIsSyncingGithub(true);
    try {
      const response = await fetch(`${API_BASE_URL}/integrations/github/sync/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ github_username: githubUsername }),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setLastEvolutionMessage(
          responseBody.detail || "Impossible de synchroniser le compte GitHub."
        );
        return;
      }

      const syncPayload = responseBody as {
        github_username: string;
        repositories_analyzed_count: number;
        newly_awarded_xp: number;
        all_achievements: ExternalAchievementItem[];
        avatar: AvatarState;
      };

      setCurrentStudent({
        ...currentStudent,
        github_username: syncPayload.github_username,
        avatar: syncPayload.avatar,
      });
      setExternalAchievements(syncPayload.all_achievements);
      await loadSkillTree(accessToken);
      await loadLeaderboards();

      setLastEvolutionMessage(
        `Synchronisation GitHub @${syncPayload.github_username} terminée (${syncPayload.repositories_analyzed_count} dépôts analysés, +${syncPayload.newly_awarded_xp} XP) : Avatar niveau ${syncPayload.avatar.level} !`
      );
    } finally {
      setIsSyncingGithub(false);
    }
  };

  const handleSyncLinkedin = async (
    linkedinProfileUrl: string,
    certificationTitle: string,
    certificationIssuer: string
  ) => {
    if (!accessToken || !currentStudent) {
      return;
    }
    setIsSyncingLinkedin(true);
    try {
      const response = await fetch(`${API_BASE_URL}/integrations/linkedin/sync/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          linkedin_profile_url: linkedinProfileUrl,
          certification_title: certificationTitle,
          certification_issuer: certificationIssuer,
        }),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setLastEvolutionMessage(
          responseBody.detail || "Impossible d'importer les données LinkedIn."
        );
        return;
      }

      const syncPayload = responseBody as {
        linkedin_profile_url: string;
        newly_awarded_xp: number;
        all_achievements: ExternalAchievementItem[];
        avatar: AvatarState;
      };

      setCurrentStudent({
        ...currentStudent,
        linkedin_profile_url: syncPayload.linkedin_profile_url,
        avatar: syncPayload.avatar,
      });
      setExternalAchievements(syncPayload.all_achievements);
      await loadSkillTree(accessToken);
      await loadLeaderboards();

      setLastEvolutionMessage(
        `Import LinkedIn terminé (+${syncPayload.newly_awarded_xp} XP) : Avatar niveau ${syncPayload.avatar.level} (${syncPayload.avatar.title}) !`
      );
    } finally {
      setIsSyncingLinkedin(false);
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
              Étape 4.3 active (Jeu de données de démonstration seed_demo : 4 Écoles & 5 Profils)
            </span>
          </div>
        </section>

        <KubernetesArchitecturePanel />

        {currentStudent ? (
          <>
            <AvatarCard
              studentProfile={currentStudent}
              onGainExperience={handleGainExperience}
              isUpdatingXp={isUpdatingXp}
              lastEvolutionMessage={lastEvolutionMessage}
            />
            <GithubSyncPanel
              initialGithubUsername={currentStudent.github_username}
              achievements={externalAchievements}
              isSyncing={isSyncingGithub}
              onSyncGithub={handleSyncGithub}
            />
            <LinkedinSyncPanel
              initialLinkedinUrl={currentStudent.linkedin_profile_url}
              achievements={externalAchievements}
              isSyncing={isSyncingLinkedin}
              onSyncLinkedin={handleSyncLinkedin}
            />
          </>
        ) : (
          <AuthenticationPanel
            apiBaseUrl={API_BASE_URL}
            onAuthenticated={handleAuthenticated}
          />
        )}

        {(studentLeaderboard.length > 0 || schoolLeaderboard.length > 0) && (
          <LeaderboardPanel
            studentEntries={studentLeaderboard}
            schoolEntries={schoolLeaderboard}
            currentUsername={currentStudent?.username}
          />
        )}

        {quests.length > 0 && (
          <QuestLogPanel
            quests={quests}
            isAuthenticated={Boolean(currentStudent)}
            activeQuestId={activeQuestId}
            onStartQuest={handleStartQuest}
            onCompleteQuest={handleCompleteQuest}
          />
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
