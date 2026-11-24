import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePathMock(path, type),
}));

// requireAdmin() wird hier als Ganzes gemockt (nicht nur auth.getUser()) -
// sein eigenes Redirect-Verhalten bei fehlender Berechtigung ist bereits in
// server.test.ts abgedeckt. assertAdmin() in admin.ts delegiert bewusst 1:1
// an requireAdmin(), damit "nicht eingeloggt" und "eingeloggt, aber kein
// Admin" ueber denselben redirect("/")-Pfad laufen und nie unterscheidbar
// sind - der Mock bildet das nach, indem beide Nicht-Admin-Faelle denselben
// NEXT_REDIRECT-Fehler werfen (wie es requireUser()/requireAdmin() in echt
// per redirect("/") tun, siehe server.ts).
const requireAdminMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}));

function rejectWithRedirect() {
  return Promise.reject(new Error("NEXT_REDIRECT:/"));
}

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

const { listAllAccounts, deleteAccount } = await import("./admin");

function adminResult() {
  return { user: { id: "admin-1", app_metadata: { is_admin: true } }, supabase: {} };
}

function accountUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "jemand@example.de",
    created_at: "2026-01-01T00:00:00Z",
    email_confirmed_at: "2026-01-02T00:00:00Z",
    app_metadata: {},
    ...overrides,
  };
}

describe("listAllAccounts", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listUsersMock.mockReset();
  });

  it("wirft/redirectet, wenn kein Admin (gleicher Pfad fuer 'kein Admin' und 'nicht eingeloggt', siehe assertAdmin())", async () => {
    requireAdminMock.mockImplementation(rejectWithRedirect);

    await expect(listAllAccounts()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("liefert bestaetigte, nicht-Test-Konten, Test-Accounts ausgefiltert", async () => {
    requireAdminMock.mockResolvedValue(adminResult());
    listUsersMock
      .mockResolvedValueOnce({
        data: {
          users: [
            accountUser({ id: "normal-1", email: "normal@example.de" }),
            accountUser({
              id: "test-1",
              email: "test@example.de",
              app_metadata: { is_test_account: true },
            }),
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    const result = await listAllAccounts();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "normal-1", confirmed: true });
  });

  it("confirmed=false bei email_confirmed_at=null", async () => {
    requireAdminMock.mockResolvedValue(adminResult());
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [accountUser({ email_confirmed_at: null })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    const result = await listAllAccounts();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ confirmed: false });
  });
});

describe("deleteAccount", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    deleteUserMock.mockReset();
    revalidatePathMock.mockClear();
  });

  it("wirft/redirectet, wenn kein Admin (gleicher Pfad fuer 'kein Admin' und 'nicht eingeloggt', siehe assertAdmin())", async () => {
    requireAdminMock.mockImplementation(rejectWithRedirect);

    await expect(deleteAccount("user-123")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("ruft auth.admin.deleteUser mit der uebergebenen ID auf", async () => {
    requireAdminMock.mockResolvedValue(adminResult());
    deleteUserMock.mockResolvedValueOnce({ error: null });

    await deleteAccount("user-123");

    expect(deleteUserMock).toHaveBeenCalledWith("user-123");
  });

  it("liefert Fehlertext bei Supabase-Fehler", async () => {
    requireAdminMock.mockResolvedValue(adminResult());
    deleteUserMock.mockResolvedValueOnce({ error: { message: "kaputt" } });

    const result = await deleteAccount("user-123");

    expect(result?.error).toContain("kaputt");
  });
});
