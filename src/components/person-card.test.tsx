// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { PersonCard } from "./person-card";

vi.mock("@/app/actions/people", () => ({
  updatePerson: vi.fn(),
  createPerson: vi.fn(),
  deletePerson: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const person = {
  id: "person-1",
  name: "Oma Erna",
  birthday_day: 14,
  birthday_month: 11,
  birthday_year: 1960,
  interests: ["Garten", "Kochen"],
  notes: "Mag keine Süßigkeiten mehr, Lieblingsfarbe Grün.",
};

describe("PersonCard", () => {
  it("zeigt Initialen-Avatar, Name, Geburtstag mit Countdown, Interessen und Notiz", () => {
    render(
      <PersonCard person={person} birthdayText="14. November 1960 · in 19 Tagen" />,
    );

    expect(screen.getByText("OE")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Oma Erna" })).not.toBeNull();
    expect(
      screen.getByText("Geburtstag: 14. November 1960 · in 19 Tagen"),
    ).not.toBeNull();
    expect(screen.getByText("Garten")).not.toBeNull();
    expect(screen.getByText("Kochen")).not.toBeNull();
    expect(
      screen.getByText(/mag keine süßigkeiten mehr/i),
    ).not.toBeNull();
  });

  it("zeigt Bearbeiten und Ideen teilen als Buttons oben, ohne das Formular standardmäßig offen zu zeigen", () => {
    render(<PersonCard person={person} birthdayText={null} />);

    expect(screen.getByRole("button", { name: /bearbeiten/i })).not.toBeNull();
    expect(
      screen.getByRole("link", { name: /ideen teilen/i }),
    ).toHaveProperty(
      "href",
      "http://localhost:3000/dashboard/teilen?person=person-1",
    );
    expect(document.querySelector('input[name="name"]')).toBeNull();
  });

  it("klappt das Bearbeiten-Formular per Klick auf/zu", () => {
    render(<PersonCard person={person} birthdayText={null} />);

    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    expect(document.querySelector('input[name="name"]')).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /fertig/i }));
    expect(document.querySelector('input[name="name"]')).toBeNull();
  });
});
