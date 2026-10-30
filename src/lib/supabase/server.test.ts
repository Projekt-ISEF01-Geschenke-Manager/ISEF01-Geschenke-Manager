import { describe, it, expect, vi, beforeEach } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: getUserMock },
  }),
}));

const getUserMock = vi.fn();

const { requireUser } = await import("./server");

describe("requireUser", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("leitet nicht eingeloggte Nutzer:innen zur Startseite weiter", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("gibt Supabase-Client und Nutzer:in zurück, wenn eingeloggt", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const result = await requireUser();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result.user).toEqual({ id: "user-1" });
    expect(result.supabase).toBeTruthy();
  });
});
