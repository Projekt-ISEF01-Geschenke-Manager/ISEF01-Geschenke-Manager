import { describe, it, expect, vi, beforeEach } from "vitest";

const listUsersMock = vi.fn();
const deleteUserMock = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => listUsersMock(...args),
        deleteUser: (...args: unknown[]) => deleteUserMock(...args),
      },
    },
  }),
}));

const { deleteUnconfirmedAccounts } = await import(
  "./delete-unconfirmed-accounts"
);

const EIGHT_DAYS_AGO = new Date(
  Date.now() - 8 * 24 * 60 * 60 * 1000,
).toISOString();
const SIX_DAYS_AGO = new Date(
  Date.now() - 6 * 24 * 60 * 60 * 1000,
).toISOString();

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "jemand@example.de",
    created_at: EIGHT_DAYS_AGO,
    email_confirmed_at: null,
    app_metadata: {},
    ...overrides,
  };
}

describe("deleteUnconfirmedAccounts", () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    deleteUserMock.mockReset().mockResolvedValue({ error: null });
  });

  it("löscht ein unbestätigtes Konto, das vor mehr als 7 Tagen registriert wurde (ZA8)", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [user({ id: "alt-unbestaetigt" })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await deleteUnconfirmedAccounts();

    expect(deleteUserMock).toHaveBeenCalledWith("alt-unbestaetigt");
  });

  it("lässt ein bestätigtes Konto unangetastet, auch wenn es alt ist", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: {
          users: [
            user({
              id: "bestaetigt",
              email_confirmed_at: EIGHT_DAYS_AGO,
            }),
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await deleteUnconfirmedAccounts();

    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("lässt ein unbestätigtes Konto unangetastet, solange es jünger als 7 Tage ist", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [user({ id: "jung", created_at: SIX_DAYS_AGO })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await deleteUnconfirmedAccounts();

    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("nimmt als Test-Account markierte Konten von der Löschung aus (ZA8)", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: {
          users: [
            user({ id: "test-account", app_metadata: { is_test_account: true } }),
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await deleteUnconfirmedAccounts();

    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("verarbeitet mehrere Seiten der Nutzerliste", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [user({ id: "seite-1" })] },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { users: [user({ id: "seite-2" })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await deleteUnconfirmedAccounts();

    expect(deleteUserMock).toHaveBeenCalledWith("seite-1");
    expect(deleteUserMock).toHaveBeenCalledWith("seite-2");
    expect(deleteUserMock).toHaveBeenCalledTimes(2);
  });

  it("wirft einen Fehler, wenn die Nutzerliste nicht geladen werden kann (damit runDailyJobs es als fehlgeschlagen meldet)", async () => {
    listUsersMock.mockResolvedValueOnce({
      data: null,
      error: { message: "network error" },
    });

    await expect(deleteUnconfirmedAccounts()).rejects.toThrow(
      "network error",
    );
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("bricht nicht komplett ab, wenn das Löschen eines einzelnen Kontos fehlschlägt, sondern meldet den Fehler am Ende", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: {
          users: [user({ id: "schlaegt-fehl" }), user({ id: "klappt" })],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    deleteUserMock
      .mockResolvedValueOnce({ error: { message: "boom" } })
      .mockResolvedValueOnce({ error: null });

    await expect(deleteUnconfirmedAccounts()).rejects.toThrow(/boom/);
    expect(deleteUserMock).toHaveBeenCalledTimes(2);
  });
});
