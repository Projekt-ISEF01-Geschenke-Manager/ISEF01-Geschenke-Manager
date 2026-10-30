import { describe, it, expect, vi, beforeEach } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

const { default: Home } = await import("./page");

function params(values: { error?: string } = {}) {
  return Promise.resolve(values);
}

describe("Home", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getUserMock.mockReset();
  });

  it("leitet eine bestehende Session direkt zur Übersicht weiter, statt die Landingpage zu zeigen", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    await expect(Home({ searchParams: params() })).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("zeigt die Landingpage/Login, wenn niemand eingeloggt ist", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const element = await Home({ searchParams: params() });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element).toBeTruthy();
  });
});
