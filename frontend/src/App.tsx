import { useCallback, useEffect, useState } from "react";
import AuthenticationPanel from "./components/AuthenticationPanel";
import AvatarCard from "./components/AvatarCard";
import GithubSyncPanel from "./components/GithubSyncPanel";
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

type ActiveWorkspaceSection =
  | "overview"
  | "skills"
  | "quests"
  | "integrations"
  | "leaderboards";

export default function App() {
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
  const [unlockingSkillId, setUnlockingSkillId] = useState<number | null>(null);
  const [activeQuestId, setActiveQuestId] = useState<number | null>(null);
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [isSyncingLinkedin, setIsSyncingLinkedin] = useState(false);
  const [lastEvolutionMessage, setLastEvolutionMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveWorkspaceSection>("overview");

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
      .then(() => {
        if (isMounted) {
          setConnectionFailed(false);
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
        // Les paliers sont optionnels lors des tests unitaires isoles.
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
      `Bienvenue ${studentProfile.username}. Votre avatar est au niveau ${studentProfile.avatar.level} (${studentProfile.avatar.title}).`
    );
  };

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    setAccessToken(null);
    setCurrentStudent(null);
    setExternalAchievements([]);
    setLastEvolutionMessage(null);
    setActiveSection("overview");
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
        `Compétence « ${unlockedPayload.unlocked_skill.name} » acquise (+${unlockedPayload.unlocked_skill.xp_reward} XP). Niveau actuel : ${unlockedPayload.avatar.level} (${unlockedPayload.avatar.title}).`
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
        `Quête « ${completedPayload.quest.title} » validée (+${completedPayload.quest.xp_reward} XP). Niveau actuel : ${completedPayload.avatar.level} (${completedPayload.avatar.title}).`
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
        `Synchronisation GitHub @${syncPayload.github_username} terminée (${syncPayload.repositories_analyzed_count} dépôts analysés, +${syncPayload.newly_awarded_xp} XP).`
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
        `Import LinkedIn enregistré (+${syncPayload.newly_awarded_xp} XP).`
      );
    } finally {
      setIsSyncingLinkedin(false);
    }
  };

  const unlockedSkillsCount = skillNodes.filter((node) => node.is_unlocked).length;
  const completedQuestsCount = quests.filter(
    (quest) => quest.student_status === "completed"
  ).length;
  const currentStudentRank =
    studentLeaderboard.find((entry) => entry.username === currentStudent?.username)
      ?.rank ?? null;

  const navigationTabs: { id: ActiveWorkspaceSection; label: string; count?: string }[] = [
    { id: "overview", label: "Vue d'ensemble" },
    {
      id: "skills",
      label: "Compétences",
      count: skillNodes.length > 0 ? `${unlockedSkillsCount}/${skillNodes.length}` : undefined,
    },
    {
      id: "quests",
      label: "Quêtes",
      count: quests.length > 0 ? `${completedQuestsCount}/${quests.length}` : undefined,
    },
    {
      id: "integrations",
      label: "GitHub & LinkedIn",
      count:
        externalAchievements.length > 0
          ? String(externalAchievements.length)
          : undefined,
    },
    {
      id: "leaderboards",
      label: "Classements",
      count:
        studentLeaderboard.length > 0 ? String(studentLeaderboard.length) : undefined,
    },
  ];

  const isSectionVisible = (sectionKey: ActiveWorkspaceSection) =>
    activeSection === "overview" || activeSection === sectionKey;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-950/70 text-indigo-300 shadow-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 12l8-4.5M12 12v9M12 12L4 7.5"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">
                CareerQuest
              </h1>
              <p className="hidden text-[11px] text-slate-400 xl:block">
                Développement professionnel & compétences
              </p>
            </div>
          </div>

          <nav
            aria-label="Navigation principale"
            data-testid="section-navigation"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800/90 bg-slate-900/90 p-1"
          >
            {navigationTabs.map((tab) => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                        isActive
                          ? "bg-indigo-800 text-indigo-100"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {connectionFailed && (
              <span className="rounded-full border border-rose-500/40 bg-rose-950/60 px-3 py-1 text-xs text-rose-300">
                Service indisponible
              </span>
            )}

            {currentStudent ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-white">
                    {currentStudent.username}
                  </p>
                  <p className="text-[11px] text-indigo-300">
                    Niv. {currentStudent.avatar.level} ({currentStudent.avatar.experience_points} XP)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <span className="hidden rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 sm:inline-block">
                Mode visiteur
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 space-y-8">
        {currentStudent ? (
          <div className="space-y-6">
            <AvatarCard
              studentProfile={currentStudent}
              lastEvolutionMessage={lastEvolutionMessage}
            />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Niveau & titre actuel</p>
                <p className="mt-1 text-lg font-bold text-white">
                  Niveau {currentStudent.avatar.level}
                </p>
                <p className="mt-0.5 text-xs text-indigo-300">
                  {currentStudent.avatar.title}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Compétences maîtrisées</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {unlockedSkillsCount} / {skillNodes.length}
                </p>
                <p className="mt-0.5 text-xs text-emerald-300">
                  4 branches techniques
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Quêtes validées</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {completedQuestsCount} / {quests.length}
                </p>
                <p className="mt-0.5 text-xs text-cyan-300">
                  Projets, formations & certifications
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Classement général</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {currentStudentRank ? `#${currentStudentRank}` : "-"}
                </p>
                <p className="mt-0.5 text-xs text-amber-300">
                  Sur {studentLeaderboard.length} étudiants inscrits
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            <div className="space-y-6 lg:col-span-7">
              <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-8">
                <span className="inline-block rounded-full border border-indigo-500/40 bg-indigo-950/80 px-3 py-1 text-xs font-medium text-indigo-300">
                  Plateforme de progression étudiante
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Construisez et validez votre parcours technique étape par étape
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Débloquez des compétences en développement, DevOps et Cloud, validez vos projets et certifications avec preuve, synchronisez vos réalisations GitHub et LinkedIn, et représentez votre établissement dans le classement inter-écoles.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs font-semibold uppercase text-indigo-300">
                      Arbre technique
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {skillNodes.length || 8} compétences
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Frontend, Backend, DevOps et Cloud avec prérequis.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs font-semibold uppercase text-emerald-300">
                      Missions & preuves
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {quests.length || 6} quêtes métiers
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Validation par dépôt Git ou certificat vérifié.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs font-semibold uppercase text-amber-300">
                      Compétition
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {schoolLeaderboard.length || 4} établissements
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Classement individuel et score cumulé par école.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <AuthenticationPanel
                apiBaseUrl={API_BASE_URL}
                onAuthenticated={handleAuthenticated}
              />
            </div>
          </div>
        )}

        {isSectionVisible("skills") && skillNodes.length > 0 && (
          <div id="section-competences" className="scroll-mt-20">
            <SkillTreeBoard
              skills={skillNodes}
              isAuthenticated={Boolean(currentStudent)}
              unlockingSkillId={unlockingSkillId}
              onUnlockSkill={handleUnlockSkill}
            />
          </div>
        )}

        {isSectionVisible("quests") && quests.length > 0 && (
          <div id="section-quetes" className="scroll-mt-20">
            <QuestLogPanel
              quests={quests}
              isAuthenticated={Boolean(currentStudent)}
              activeQuestId={activeQuestId}
              onStartQuest={handleStartQuest}
              onCompleteQuest={handleCompleteQuest}
            />
          </div>
        )}

        {isSectionVisible("integrations") && currentStudent && (
          <div
            id="section-integrations"
            className="scroll-mt-20 grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
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
          </div>
        )}

        {isSectionVisible("integrations") && !currentStudent && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
            <h3 className="text-base font-semibold text-white">
              Synchronisation GitHub et LinkedIn
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Connectez-vous à votre compte étudiant pour lier vos dépôts GitHub et importer vos certifications LinkedIn.
            </p>
          </section>
        )}

        {isSectionVisible("leaderboards") &&
          (studentLeaderboard.length > 0 || schoolLeaderboard.length > 0) && (
            <div id="section-classements" className="scroll-mt-20">
              <LeaderboardPanel
                studentEntries={studentLeaderboard}
                schoolEntries={schoolLeaderboard}
                currentUsername={currentStudent?.username}
              />
            </div>
          )}

        {isSectionVisible("overview") && progressionLadder && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Paliers d'évolution de carrière
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Chaque tranche de {progressionLadder.xp_per_level} XP fait progresser votre niveau et débloque de nouveaux titres.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {progressionLadder.tiers.map((tierItem) => {
                const isCurrentTier =
                  currentStudent?.avatar.visual_tier === tierItem.visual_tier;
                return (
                  <div
                    key={tierItem.visual_tier}
                    className={`rounded-xl border p-4 transition-colors ${
                      isCurrentTier
                        ? "border-emerald-500/60 bg-emerald-950/25"
                        : "border-slate-800 bg-slate-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-indigo-950 px-2.5 py-0.5 text-xs font-semibold uppercase text-indigo-300">
                        {tierItem.visual_tier}
                      </span>
                      <span className="text-xs text-slate-400">
                        Niveau {tierItem.min_level}+
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-white">
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

      <footer className="mt-12 border-t border-slate-900 bg-slate-950 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-slate-500">
          <p>CareerQuest : Plateforme de progression professionnelle et de compétences.</p>
          <p>Arbre de compétences, Quêtes, GitHub, LinkedIn & Classements inter-écoles.</p>
        </div>
      </footer>
    </div>
  );
}
