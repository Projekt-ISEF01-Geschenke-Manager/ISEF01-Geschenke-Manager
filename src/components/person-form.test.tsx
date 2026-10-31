// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PersonForm } from "./person-form";

const createPersonMock = vi.fn();
const updatePersonMock = vi.fn();
vi.mock("@/app/actions/people", () => ({
  createPerson: (...args: unknown[]) => createPersonMock(...args),
  updatePerson: (...args: unknown[]) => updatePersonMock(...args),
}));

afterEach(() => {
  cleanup();
  createPersonMock.mockReset();
  updatePersonMock.mockReset();
});

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/name \*/i), {
    target: { value: "Oma Erna" },
  });
}

describe("PersonForm", () => {
  it("zeigt eine Fehlermeldung aus dem Server-Action-State an", async () => {
    createPersonMock.mockResolvedValue({ error: "Bitte gib einen Namen ein." });
    render(<PersonForm />);

    fireEvent.click(screen.getByRole("button", { name: "Person anlegen" }));

    await waitFor(() =>
      expect(screen.getByText("Bitte gib einen Namen ein.")).not.toBeNull(),
    );
  });

  it(
    "ruft onSuccess auf, sobald das Anlegen erfolgreich war (Popup auf der " +
      "Übersicht soll dann schließen)",
    async () => {
      createPersonMock.mockResolvedValue({ success: true });
      const onSuccess = vi.fn();
      render(<PersonForm onSuccess={onSuccess} />);

      fillRequiredFields();
      fireEvent.click(screen.getByRole("button", { name: "Person anlegen" }));

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    },
  );

  it("ruft onSuccess NICHT auf, wenn das Anlegen fehlschlägt", async () => {
    createPersonMock.mockResolvedValue({ error: "db down" });
    const onSuccess = vi.fn();
    render(<PersonForm onSuccess={onSuccess} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Person anlegen" }));

    await waitFor(() => expect(screen.getByText("db down")).not.toBeNull());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("funktioniert ohne onSuccess (Bearbeiten-Formular auf der Personenseite)", async () => {
    updatePersonMock.mockResolvedValue({ success: true });
    const person = {
      id: "person-1",
      name: "Oma Erna",
      birthday_day: null,
      birthday_month: null,
      birthday_year: null,
      interests: [],
      notes: null,
    };
    render(<PersonForm person={person} />);

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(updatePersonMock).toHaveBeenCalled());
  });
});
