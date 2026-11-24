import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePathMock(path, type),
}));

const requireUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  requireUser: (...args: unknown[]) => requireUserMock(...args),
}));

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

function adminUser() {
  return { id: "admin-1", app_metadata: { is_admin: true } };
}

function nonAdminUser() {
  return { id: "user-1", app_metadata: {} };
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
    requireUserMock.mockReset();
    listUsersMock.mockReset();
  });

  it("wirft, wenn kein Admin", async () => {
    requireUserMock.mockResolvedValue({ user: nonAdminUser() });

    await expect(listAllAccounts()).rejects.toThrow();
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("liefert bestaetigte, nicht-Test-Konten, Test-Accounts ausgefiltert", async () => {
    requireUserMock.mockResolvedValue({ user: adminUser() });
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
    requireUserMock.mockResolvedValue({ user: adminUser() });
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
    requireUserMock.mockReset();
    deleteUserMock.mockReset();
    revalidatePathMock.mockClear();
  });

  it("wirft/liefert Fehler, wenn kein Admin", async () => {
    requireUserMock.mockResolvedValue({ user: nonAdminUser() });

    await expect(deleteAccount("user-123")).rejects.toThrow();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("ruft auth.admin.deleteUser mit der uebergebenen ID auf", async () => {
    requireUserMock.mockResolvedValue({ user: adminUser() });
    deleteUserMock.mockResolvedValueOnce({ error: null });

    await deleteAccount("user-123");

    expect(deleteUserMock).toHaveBeenCalledWith("user-123");
  });

  it("liefert Fehlertext bei Supabase-Fehler", async () => {
    requireUserMock.mockResolvedValue({ user: adminUser() });
    deleteUserMock.mockResolvedValueOnce({ error: { message: "kaputt" } });

    const result = await deleteAccount("user-123");

    expect(result?.error).toContain("kaputt");
  });
});
