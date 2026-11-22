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
    // Name wird trotzdem ausgefuellt - sonst blockiert die native
    // required-Validierung des Browsers die Übermittlung schon vor der
    // (hier gemockten) Server Action, und der Fehlerzustand wird nie
    // gerendert. Getestet wird die Anzeige des State-Fehlers, nicht die
    // Browser-Validierung selbst.
    createPersonMock.mockResolvedValue({ error: "Bitte gib einen Namen ein." });
    render(<PersonForm />);

    fillRequiredFields();
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
      reminders_enabled: true,
    };
    render(<PersonForm person={person} />);

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(updatePersonMock).toHaveBeenCalled());
  });

  it("zeigt die Checkbox 'In Erinnerungen einschließen', per Default angehakt", () => {
    render(<PersonForm />);
    expect(
      screen.getByRole("checkbox", { name: /in erinnerungen einschließen/i }),
    ).toHaveProperty("checked", true);
  });

  it(
    "behaelt die abgewaehlte Erinnerungen-Checkbox bei fehlgeschlagener " +
      "Validierung bei (statt auf den DB-Wert zurueckzuspringen)",
    async () => {
      // Name wird ausgefuellt, damit die native required-Validierung des
      // Browsers die Übermittlung nicht blockiert - der (hier gemockte)
      // Fehlschlag soll ein anderes Feld betreffen. Die zurueckgegebenen
      // state.values spiegeln das wider: remindersEnabled bleibt false,
      // so wie es der Nutzer in der Checkbox eingestellt hat.
      createPersonMock.mockResolvedValue({
        error: "Bitte gib ein gültiges Geburtsdatum ein.",
        values: {
          name: "Oma Erna",
          birthdayDay: "99",
          birthdayMonth: "",
          birthdayYear: "",
          interests: "",
          notes: "",
          remindersEnabled: false,
        },
      });
      render(<PersonForm />);

      fillRequiredFields();
      const checkbox = screen.getByRole("checkbox", {
        name: /in erinnerungen einschließen/i,
      });
      expect(checkbox).toHaveProperty("checked", true);
      fireEvent.click(checkbox);
      expect(checkbox).toHaveProperty("checked", false);

      fireEvent.click(screen.getByRole("button", { name: "Person anlegen" }));

      await waitFor(() =>
        expect(
          screen.getByText("Bitte gib ein gültiges Geburtsdatum ein."),
        ).not.toBeNull(),
      );

      expect(
        screen.getByRole("checkbox", { name: /in erinnerungen einschließen/i }),
      ).toHaveProperty("checked", false);
    },
  );

  it("übernimmt reminders_enabled=false einer bestehenden Person als nicht angehakt", () => {
    render(
      <PersonForm
        person={{
          id: "1",
          name: "Oma Erna",
          birthday_day: null,
          birthday_month: null,
          birthday_year: null,
          interests: [],
          notes: null,
          reminders_enabled: false,
        }}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: /in erinnerungen einschließen/i }),
    ).toHaveProperty("checked", false);
  });
});
