import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import AvatarCard from "./components/AvatarCard";
import GithubSyncPanel from "./components/GithubSyncPanel";
import LeaderboardPanel from "./components/LeaderboardPanel";
import LinkedinSyncPanel from "./components/LinkedinSyncPanel";
import QuestLogPanel from "./components/QuestLogPanel";
import SkillTreeBoard from "./components/SkillTreeBoard";
import {
  ExternalAchievementItem,
  QuestItem,
  SchoolLeaderboardEntry,
  SkillNodeItem,
  StudentLeaderboardEntry,
  StudentProfile,
} from "./types/careerquest";

describe("CareerQuest UI Components", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("displays the CareerQuest header, authentication panel and avatar tiers", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const requestUrl = String(input);
      if (requestUrl.includes("/avatar/progression-tiers/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            xp_per_level: 100,
            tiers: [
              { min_level: 1, min_xp: 0, visual_tier: "novice", title: "Novice" },
              { min_level: 3, min_xp: 200, visual_tier: "apprenti", title: "Apprenti DevOps" },
            ],
          }),
        } as Response;
      }

      if (
        requestUrl.includes("/skills/") ||
        requestUrl.includes("/quests/") ||
        requestUrl.includes("/integrations/achievements/") ||
        requestUrl.includes("/leaderboard/")
      ) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          service: "careerquest-backend",
          database: "connected",
        }),
      } as Response;
    });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("CareerQuest")).toBeInTheDocument();
    expect(screen.getByTestId("auth-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tab-login"));
    expect(screen.getByTestId("auth-submit-button")).toHaveTextContent("Se connecter");

    await waitFor(() => {
      expect(screen.getByText("Apprenti DevOps")).toBeInTheDocument();
      expect(screen.getByTestId("section-navigation")).toBeInTheDocument();
      expect(
        screen.getByText("Paliers d'évolution de carrière")
      ).toBeInTheDocument();
    });
  });

  it("renders the evolving AvatarCard across visual tiers and triggers XP gain", () => {
    const gainXpCallback = vi.fn();
    const sampleProfile: StudentProfile = {
      id: 1,
      username: "frank_devops",
      email: "frank@careerquest.fr",
      school: { id: 1, name: "Epitech Digital", city: "Paris" },
      github_username: "frank-kenfack",
      linkedin_profile_url: "",
      avatar: {
        level: 5,
        experience_points: 450,
        xp_for_next_level: 500,
        current_level_progress_percent: 50,
        title: "Ingenieur Cloud Confirme",
        visual_tier: "confirme",
      },
    };

    render(
      <AvatarCard
        studentProfile={sampleProfile}
        onGainExperience={gainXpCallback}
        lastEvolutionMessage="Passage au niveau 5 !"
      />
    );

    expect(screen.getByTestId("avatar-emblem-confirme")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-tier-badge")).toHaveTextContent("confirme");
    expect(screen.getByTestId("avatar-title")).toHaveTextContent("Ingenieur Cloud Confirme");
    expect(screen.getByTestId("avatar-xp-value")).toHaveTextContent("450 / 500 XP");
    expect(screen.getByTestId("avatar-evolution-banner")).toHaveTextContent("Passage au niveau 5 !");

    fireEvent.click(screen.getByText("+100 XP (Valider un entraînement)"));
    expect(gainXpCallback).toHaveBeenCalledWith(100);
  });

  it("renders SkillTreeBoard states (ACQUIS, DISPONIBLE, VERROUILLÉ), filters branches and triggers skill unlock", () => {
    const unlockCallback = vi.fn();
    const sampleSkills: SkillNodeItem[] = [
      {
        id: 10,
        code: "docker-containers",
        name: "Conteneurisation Docker Multi-Services",
        category: "devops",
        description: "Isoler les services applicatifs.",
        xp_reward: 100,
        required_level: 1,
        parent_skill_id: null,
        parent_skill_code: null,
        parent_skill_name: null,
        is_unlocked: true,
        is_available: false,
      },
      {
        id: 11,
        code: "gitlab-cicd",
        name: "Pipelines GitLab CI & GitHub Actions",
        category: "devops",
        description: "Automatiser la validation et les tests.",
        xp_reward: 150,
        required_level: 2,
        parent_skill_id: 10,
        parent_skill_code: "docker-containers",
        parent_skill_name: "Conteneurisation Docker Multi-Services",
        is_unlocked: false,
        is_available: true,
      },
      {
        id: 12,
        code: "kubernetes-cluster",
        name: "Orchestration Kubernetes, Ingress & PVC",
        category: "cloud",
        description: "Deployer sur cluster.",
        xp_reward: 200,
        required_level: 3,
        parent_skill_id: 9,
        parent_skill_code: "cloud-networking",
        parent_skill_name: "Reseaux Cloud, Nginx & Reverse Proxy",
        is_unlocked: false,
        is_available: false,
      },
    ];

    render(
      <SkillTreeBoard
        skills={sampleSkills}
        isAuthenticated={true}
        unlockingSkillId={null}
        onUnlockSkill={unlockCallback}
      />
    );

    expect(screen.getByTestId("skill-tree-mastery-counter")).toHaveTextContent(
      "1 / 3 compétences acquises"
    );
    expect(screen.getByTestId("skill-status-docker-containers")).toHaveTextContent("ACQUIS");
    expect(screen.getByTestId("skill-status-gitlab-cicd")).toHaveTextContent("DISPONIBLE");
    expect(screen.getByTestId("skill-status-kubernetes-cluster")).toHaveTextContent("VERROUILLÉ");

    fireEvent.click(screen.getByTestId("unlock-button-gitlab-cicd"));
    expect(unlockCallback).toHaveBeenCalledWith(11);

    fireEvent.click(screen.getByTestId("filter-branch-devops"));
    expect(screen.getByTestId("skill-branch-devops")).toBeInTheDocument();
    expect(screen.queryByTestId("skill-branch-cloud")).not.toBeInTheDocument();
  });

  it("renders QuestLogPanel, filters by quest category and submits proof URL on completion", () => {
    const startQuestCallback = vi.fn();
    const completeQuestCallback = vi.fn();
    const sampleQuests: QuestItem[] = [
      {
        id: 21,
        code: "quest-docker-stack",
        title: "Deployer une architecture 3 conteneurs Docker",
        quest_type: "project",
        description: "Orchestrer PostgreSQL, Django et Nginx/React.",
        xp_reward: 150,
        related_skill_id: 10,
        related_skill_code: "docker-containers",
        related_skill_name: "Conteneurisation Docker Multi-Services",
        student_status: "not_started",
        proof_url: "",
        completed_at: null,
      },
      {
        id: 22,
        code: "quest-cka-kubernetes",
        title: "Certification Cloud Native Kubernetes (CKA)",
        quest_type: "certification",
        description: "Valider le deploiement d'un cluster Kubernetes.",
        xp_reward: 250,
        related_skill_id: 12,
        related_skill_code: "kubernetes-cluster",
        related_skill_name: "Orchestration Kubernetes, Ingress & PVC",
        student_status: "completed",
        proof_url: "https://github.com/frank-kenfack/CareerQuest",
        completed_at: "2026-11-20T18:00:00Z",
      },
    ];

    render(
      <QuestLogPanel
        quests={sampleQuests}
        isAuthenticated={true}
        activeQuestId={null}
        onStartQuest={startQuestCallback}
        onCompleteQuest={completeQuestCallback}
      />
    );

    expect(screen.getByTestId("quest-completion-counter")).toHaveTextContent(
      "1 / 2 quêtes accomplies (50%)"
    );
    expect(screen.getByTestId("quest-status-quest-docker-stack")).toHaveTextContent("À DÉMARRER");
    expect(screen.getByTestId("quest-status-quest-cka-kubernetes")).toHaveTextContent("VALIDÉE");

    fireEvent.click(screen.getByTestId("start-quest-quest-docker-stack"));
    expect(startQuestCallback).toHaveBeenCalledWith(21);

    fireEvent.change(screen.getByTestId("proof-input-quest-docker-stack"), {
      target: { value: "https://github.com/frank-kenfack/CareerQuest/pull/1" },
    });
    fireEvent.click(screen.getByTestId("complete-quest-quest-docker-stack"));
    expect(completeQuestCallback).toHaveBeenCalledWith(
      21,
      "https://github.com/frank-kenfack/CareerQuest/pull/1"
    );

    fireEvent.click(screen.getByTestId("filter-quest-certification"));
    expect(screen.getByTestId("quest-card-quest-cka-kubernetes")).toBeInTheDocument();
    expect(screen.queryByTestId("quest-card-quest-docker-stack")).not.toBeInTheDocument();
  });

  it("renders GithubSyncPanel achievements and triggers synchronization", () => {
    const syncGithubCallback = vi.fn();
    const sampleAchievements: ExternalAchievementItem[] = [
      {
        id: 1,
        provider: "github",
        external_key: "github-careerquest-repository",
        title: "Architecte du depot GitHub CareerQuest",
        xp_awarded: 150,
        synced_at: "2026-11-20T19:00:00Z",
      },
    ];

    render(
      <GithubSyncPanel
        initialGithubUsername="frank-kenfack"
        achievements={sampleAchievements}
        isSyncing={false}
        onSyncGithub={syncGithubCallback}
      />
    );

    expect(screen.getByTestId("github-achievements-counter")).toHaveTextContent(
      "1 accomplissements GitHub (+150 XP)"
    );
    expect(
      screen.getByTestId("github-achievement-github-careerquest-repository")
    ).toHaveTextContent("Architecte du depot GitHub CareerQuest");

    fireEvent.click(screen.getByTestId("github-sync-button"));
    expect(syncGithubCallback).toHaveBeenCalledWith("frank-kenfack");
  });

  it("renders LinkedinSyncPanel achievements and imports certification", () => {
    const syncLinkedinCallback = vi.fn();
    const sampleAchievements: ExternalAchievementItem[] = [
      {
        id: 2,
        provider: "linkedin",
        external_key: "linkedin-profile-connected",
        title: "Profil professionnel LinkedIn verifie",
        xp_awarded: 75,
        synced_at: "2026-11-20T19:05:00Z",
      },
    ];

    render(
      <LinkedinSyncPanel
        initialLinkedinUrl="https://www.linkedin.com/in/frank-kenfack"
        achievements={sampleAchievements}
        isSyncing={false}
        onSyncLinkedin={syncLinkedinCallback}
      />
    );

    expect(screen.getByTestId("linkedin-achievements-counter")).toHaveTextContent(
      "1 accomplissements LinkedIn (+75 XP)"
    );
    expect(
      screen.getByTestId("linkedin-achievement-linkedin-profile-connected")
    ).toHaveTextContent("Profil professionnel LinkedIn verifie");

    fireEvent.click(screen.getByTestId("linkedin-sync-button"));
    expect(syncLinkedinCallback).toHaveBeenCalledWith(
      "https://www.linkedin.com/in/frank-kenfack",
      "Kubernetes & Cloud Native DevOps",
      "Linux Foundation"
    );
  });

  it("renders LeaderboardPanel student and school rankings and switches tabs", () => {
    const studentEntries: StudentLeaderboardEntry[] = [
      {
        rank: 1,
        student_id: 1,
        username: "frank_devops",
        school_name: "Epitech Digital",
        school_city: "Paris",
        level: 15,
        experience_points: 1495,
        title: "Maitre Architecte Fullstack",
        visual_tier: "maitre",
        unlocked_skills_count: 2,
        completed_quests_count: 1,
      },
      {
        rank: 2,
        student_id: 2,
        username: "lina_cloud",
        school_name: "IMT Atlantique",
        school_city: "Nantes",
        level: 6,
        experience_points: 520,
        title: "Ingenieur Cloud Confirme",
        visual_tier: "confirme",
        unlocked_skills_count: 3,
        completed_quests_count: 2,
      },
    ];

    const schoolEntries: SchoolLeaderboardEntry[] = [
      {
        rank: 1,
        school_id: 1,
        school_name: "Epitech Digital",
        city: "Paris",
        students_count: 1,
        total_experience_points: 1495,
        average_level: 15,
        top_student_username: "frank_devops",
      },
      {
        rank: 2,
        school_id: 2,
        school_name: "IMT Atlantique",
        city: "Nantes",
        students_count: 1,
        total_experience_points: 520,
        average_level: 6,
        top_student_username: "lina_cloud",
      },
    ];

    render(
      <LeaderboardPanel
        studentEntries={studentEntries}
        schoolEntries={schoolEntries}
        currentUsername="frank_devops"
      />
    );

    expect(screen.getByTestId("leaderboard-student-frank_devops")).toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-xp-frank_devops")).toHaveTextContent("1495 XP");

    fireEvent.click(screen.getByTestId("tab-leaderboard-schools"));
    expect(screen.getByTestId("leaderboard-school-Epitech Digital")).toHaveTextContent(
      "1495 XP cumulés"
    );
    expect(screen.getByTestId("leaderboard-school-IMT Atlantique")).toHaveTextContent(
      "520 XP cumulés"
    );
  });
});
