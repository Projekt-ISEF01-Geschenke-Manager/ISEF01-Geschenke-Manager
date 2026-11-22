// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReminderSettingsForm } from "./reminder-settings-form";

const updateReminderSettingsMock = vi.fn();
vi.mock("@/app/actions/settings", () => ({
  updateReminderSettings: (...args: unknown[]) =>
    updateReminderSettingsMock(...args),
}));

afterEach(() => {
  cleanup();
  updateReminderSettingsMock.mockReset();
});

describe("ReminderSettingsForm", () => {
  it("zeigt beide Schalter mit den übergebenen Anfangswerten", () => {
    render(
      <ReminderSettingsForm
        initialRemindBirthdays={false}
        initialRemindChristmas={true}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: /geburtstagserinnerung/i }),
    ).toHaveProperty("checked", false);
    expect(
      screen.getByRole("checkbox", { name: /weihnachts-statusübersicht/i }),
    ).toHaveProperty("checked", true);
  });

  it("zeigt eine Erfolgsmeldung, wenn das Speichern erfolgreich war", async () => {
    updateReminderSettingsMock.mockResolvedValue({ success: true });
    render(
      <ReminderSettingsForm
        initialRemindBirthdays={true}
        initialRemindChristmas={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(screen.getByText(/gespeichert/i)).not.toBeNull(),
    );
  });

  it("zeigt eine Fehlermeldung aus dem Server-Action-State an", async () => {
    updateReminderSettingsMock.mockResolvedValue({ error: "kaputt" });
    render(
      <ReminderSettingsForm
        initialRemindBirthdays={true}
        initialRemindChristmas={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(screen.getByText("kaputt")).not.toBeNull());
  });
});
