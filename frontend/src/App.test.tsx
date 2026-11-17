import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays the CareerQuest header and connected backend status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        service: "careerquest-backend",
        database: "connected",
      }),
    } as Response);

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
    });
  });
});
