// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PreviousGiftsCard } from "./previous-gifts-card";

afterEach(cleanup);

describe("PreviousGiftsCard", () => {
  it("zeigt einen Hinweis, wenn es noch keine früheren Geschenke gibt", () => {
    render(<PreviousGiftsCard personName="Oma Erna" gifts={[]} />);

    expect(
      screen.getByText("Noch keine früheren Geschenke für Oma Erna."),
    ).not.toBeNull();
  });

  it("zeigt Titel, Anlass, Datum und optionale Beschreibung je Geschenk", () => {
    render(
      <PreviousGiftsCard
        personName="Oma Erna"
        gifts={[
          {
            id: "gift-1",
            title: "Kräutergarten-Set",
            description: "Hat sich sehr gefreut.",
            occasion_name: "Weihnachten",
            gift_date: "2025-12-24",
          },
          {
            id: "gift-2",
            title: "Gutschein Gärtnerei",
            description: null,
            occasion_name: null,
            gift_date: "2026-11-14",
          },
        ]}
      />,
    );

    expect(screen.getByText("Kräutergarten-Set")).not.toBeNull();
    expect(
      screen.getByText("Weihnachten · 24. Dezember 2025"),
    ).not.toBeNull();
    expect(screen.getByText("Hat sich sehr gefreut.")).not.toBeNull();

    expect(screen.getByText("Gutschein Gärtnerei")).not.toBeNull();
    expect(screen.getByText("ohne Anlass · 14. November 2026")).not.toBeNull();
  });
});
