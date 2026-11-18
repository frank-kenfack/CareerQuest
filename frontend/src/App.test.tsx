import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import AvatarCard from "./components/AvatarCard";
import { StudentProfile } from "./types/careerquest";

describe("App and Avatar UI components", () => {
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
      expect(screen.getByTestId("backend-status")).toHaveTextContent(
        "API active (connected)"
      );
      expect(screen.getByText("Apprenti DevOps")).toBeInTheDocument();
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
});
