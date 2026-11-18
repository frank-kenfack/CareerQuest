import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays the CareerQuest header, connected backend status and avatar tiers", async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId("backend-status")).toHaveTextContent(
        "API active (connected)"
      );
      expect(screen.getByText("Apprenti DevOps")).toBeInTheDocument();
    });
  });
});
