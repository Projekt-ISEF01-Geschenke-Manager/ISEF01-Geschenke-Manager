// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const peopleOrderMock = vi.fn();
const occasionsOrderMock = vi.fn();
const giftsSelectMock = vi.fn();
let fullName: string | undefined = "Adrian";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => ({
    supabase: {
      from: (table: string) => {
        if (table === "people") {
          return { select: () => ({ order: peopleOrderMock }) };
        }
        if (table === "occasions") {
          return { select: () => ({ order: occasionsOrderMock }) };
        }
        if (table === "gifts") {
          return { select: (...args: unknown[]) => giftsSelectMock(...args) };
        }
        throw new Error(`Unerwartete Tabelle in Test: ${table}`);
      },
    },
    user: { user_metadata: { full_name: fullName } },
  }),
}));

vi.mock("@/app/actions/auth", () => ({
  signout: async () => {},
}));

const { default: DashboardPage } = await import("./page");

// Fixer "heute"-Zeitpunkt, damit die Tage-bis-Berechnungen deterministisch
// sind (siehe src/lib/upcoming.ts).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 26)); // 26.10.2026
  peopleOrderMock.mockReset();
  occasionsOrderMock.mockReset();
  giftsSelectMock.mockReset();
  fullName = "Adrian";
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("DashboardPage", () => {
  it("zeigt den Vornamen aus den Nutzer:innen-Metadaten", async () => {
    peopleOrderMock.mockResolvedValue({ data: [] });
    occasionsOrderMock.mockResolvedValue({ data: [] });
    giftsSelectMock.mockResolvedValue({ data: [] });

    const element = await DashboardPage();
    render(element);

    expect(screen.getByText("Adrian")).not.toBeNull();
  });

  it("zeigt nur den ersten Namen, auch wenn full_name mehrere Wörter enthält", async () => {
    fullName = "Jakob Höynck";
    peopleOrderMock.mockResolvedValue({ data: [] });
    occasionsOrderMock.mockResolvedValue({ data: [] });
    giftsSelectMock.mockResolvedValue({ data: [] });

    const element = await DashboardPage();
    render(element);

    expect(screen.getByText("Jakob")).not.toBeNull();
    expect(screen.queryByText("Jakob Höynck")).toBeNull();
  });

  it("zeigt die Zeile gar nicht, wenn kein Name hinterlegt ist", async () => {
    fullName = undefined;
    peopleOrderMock.mockResolvedValue({ data: [] });
    occasionsOrderMock.mockResolvedValue({ data: [] });
    giftsSelectMock.mockResolvedValue({ data: [] });

    const element = await DashboardPage();
    render(element);

    expect(screen.queryByText(/Angemeldet als/)).toBeNull();
  });

  it(
    "zeigt Geburtstage der naechsten 60 Tage und Weihnachten, sortiert " +
      "nach Tagen bis dahin",
    async () => {
      peopleOrderMock.mockResolvedValue({
        data: [
          {
            id: "person-1",
            name: "Oma Erna",
            birthday_day: 14,
            birthday_month: 11, // in 19 Tagen ab 26.10.2026
            birthday_year: 1960,
            interests: [],
          },
          {
            id: "person-2",
            name: "Opa Karl",
            birthday_day: 1,
            birthday_month: 1, // weit ausserhalb des 60-Tage-Fensters
            birthday_year: null,
            interests: [],
          },
        ],
      });
      occasionsOrderMock.mockResolvedValue({
        data: [{ id: "occasion-weihnachten", name: "Weihnachten" }],
      });
      giftsSelectMock.mockResolvedValue({
        data: [
          {
            person_id: "person-1",
            status: "idea",
            occasion_id: "occasion-weihnachten",
          },
        ],
      });

      const element = await DashboardPage();
      render(element);

      const heading = screen.getByText("Nächste Anlässe");
      const list = heading.parentElement?.querySelector("ul");
      const labels = Array.from(list?.querySelectorAll("li") ?? []).map(
        (li) => li.textContent,
      );

      // Geburtstag (in 19 Tagen) kommt vor Weihnachten (in 59 Tagen);
      // Opa Karls Geburtstag (1. Januar, weit draussen) taucht nicht auf.
      expect(labels).toHaveLength(2);
      expect(labels[0]).toContain("Geburtstag");
      expect(labels[0]).toContain("in 19 Tagen");
      expect(labels[1]).toContain("Weihnachten");
      expect(labels[1]).toContain("in 59 Tagen");
      expect(labels.join(" ")).not.toContain("Opa Karl");
    },
  );

  it("zeigt den Weihnachtsstatus nur, wenn es Weihnachts-Ideen gibt", async () => {
    peopleOrderMock.mockResolvedValue({
      data: [
        {
          id: "person-1",
          name: "Oma Erna",
          birthday_day: null,
          birthday_month: null,
          birthday_year: null,
          interests: [],
        },
        {
          id: "person-2",
          name: "Papa",
          birthday_day: null,
          birthday_month: null,
          birthday_year: null,
          interests: [],
        },
      ],
    });
    occasionsOrderMock.mockResolvedValue({
      data: [{ id: "occasion-weihnachten", name: "Weihnachten" }],
    });
    giftsSelectMock.mockResolvedValue({
      data: [
        {
          person_id: "person-1",
          status: "purchased",
          occasion_id: "occasion-weihnachten",
        },
        {
          person_id: "person-2",
          status: "idea",
          occasion_id: "occasion-weihnachten",
        },
      ],
    });

    const element = await DashboardPage();
    render(element);

    expect(screen.getByText("1 von 2 Personen besorgt")).not.toBeNull();
  });

  it("blendet den Weihnachtsstatus aus, wenn niemand eine Weihnachts-Idee hat", async () => {
    peopleOrderMock.mockResolvedValue({ data: [] });
    occasionsOrderMock.mockResolvedValue({
      data: [{ id: "occasion-weihnachten", name: "Weihnachten" }],
    });
    giftsSelectMock.mockResolvedValue({ data: [] });

    const element = await DashboardPage();
    render(element);

    expect(screen.queryByText("Weihnachtsstatus")).toBeNull();
  });
});
