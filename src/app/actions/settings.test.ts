import { describe, it, expect, vi, beforeEach } from "vitest";

const updateUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      updateUser: updateUserMock,
    },
  }),
}));

const { updateReminderSettings } = await import("./settings");

describe("updateReminderSettings", () => {
  beforeEach(() => {
    updateUserMock.mockReset().mockResolvedValue({ error: null });
  });

  it("speichert remind_birthdays=false und remind_christmas=true", async () => {
    const formData = new FormData();
    formData.set("remindChristmas", "on");
    // remindBirthdays bewusst nicht gesetzt
    await updateReminderSettings(undefined, formData);
    expect(updateUserMock).toHaveBeenCalledWith({
      data: { remind_birthdays: false, remind_christmas: true },
    });
  });

  it("gibt einen Fehler zurück, wenn Supabase einen Fehler liefert", async () => {
    updateUserMock.mockResolvedValue({ error: { message: "kaputt" } });
    const result = await updateReminderSettings(undefined, new FormData());
    expect(result?.error).toBe("kaputt");
  });
});
