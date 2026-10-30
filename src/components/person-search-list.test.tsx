// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersonSearchList } from "./person-search-list";

afterEach(() => {
  cleanup();
});

const people = [
  {
    id: "person-1",
    name: "Oma Erna",
    birthday: "14. November",
    interests: ["Garten"],
    ideaCount: 3,
    purchasedCount: 2,
  },
  {
    id: "person-2",
    name: "Papa",
    birthday: null,
    interests: [],
    ideaCount: 0,
    purchasedCount: 1,
  },
];

describe("PersonSearchList", () => {
  it("zeigt alle Personen mit Ideen- und Geschenke-Zähler", () => {
    render(<PersonSearchList people={people} />);

    expect(screen.getByText("Oma Erna")).not.toBeNull();
    expect(screen.getByText("Papa")).not.toBeNull();
    expect(screen.getByText("3 Ideen")).not.toBeNull();
    expect(screen.getByText("2 Geschenke")).not.toBeNull();
  });

  it("filtert die Liste nach Namen", () => {
    render(<PersonSearchList people={people} />);

    fireEvent.change(screen.getByPlaceholderText("Person suchen …"), {
      target: { value: "pap" },
    });

    expect(screen.queryByText("Oma Erna")).toBeNull();
    expect(screen.getByText("Papa")).not.toBeNull();
  });

  it("zeigt einen Hinweis, wenn die Suche nichts findet", () => {
    render(<PersonSearchList people={people} />);

    fireEvent.change(screen.getByPlaceholderText("Person suchen …"), {
      target: { value: "niemand" },
    });

    expect(screen.getByText("Keine Person gefunden.")).not.toBeNull();
  });

  it("zeigt ohne Personen den Hinweis, die erste Person anzulegen, ohne Suchfeld", () => {
    render(<PersonSearchList people={[]} />);

    expect(screen.getByText("Lege deine erste Person an.")).not.toBeNull();
    expect(screen.queryByPlaceholderText("Person suchen …")).toBeNull();
  });

  it("bietet immer einen zweiten Weg, eine Person anzulegen", () => {
    render(<PersonSearchList people={people} />);

    const addLink = screen.getByText("+ Person anlegen");
    expect(addLink.getAttribute("href")).toBe("#person-anlegen");
  });

  it(
    "öffnet das Formular explizit beim Klick, statt sich auf das " +
      "automatische Aufklappen beim Anker-Sprung zu verlassen",
    () => {
      const details = document.createElement("details");
      details.id = "person-anlegen";
      document.body.appendChild(details);
      render(<PersonSearchList people={people} />);

      expect(details.open).toBe(false);

      fireEvent.click(screen.getByText("+ Person anlegen"));

      expect(details.open).toBe(true);

      details.remove();
    },
  );
});
