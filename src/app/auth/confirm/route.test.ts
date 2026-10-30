import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const verifyOtpMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: verifyOtpMock } }),
}));

const { GET } = await import("./route");

function confirmRequest(query: string) {
  return new NextRequest(`https://gift-wise.de/auth/confirm${query}`);
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    verifyOtpMock.mockReset();
  });

  it("leitet nach erfolgreicher Bestätigung ohne next-Parameter zu /dashboard weiter", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });

    const response = await GET(confirmRequest("?token_hash=abc&type=signup"));

    expect(response.headers.get("location")).toBe(
      "https://gift-wise.de/dashboard",
    );
  });

  it("folgt einem relativen next-Pfad", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });

    const response = await GET(
      confirmRequest(
        "?token_hash=abc&type=signup&next=/register/check-email",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://gift-wise.de/register/check-email",
    );
  });

  it(
    "ignoriert einen absoluten next-Link (offene Weiterleitung) und faellt " +
      "auf /dashboard zurueck",
    async () => {
      verifyOtpMock.mockResolvedValue({ error: null });

      const response = await GET(
        confirmRequest(
          "?token_hash=abc&type=signup&next=https://evil.example/phish",
        ),
      );

      expect(response.headers.get("location")).toBe(
        "https://gift-wise.de/dashboard",
      );
    },
  );

  it("ignoriert einen protokoll-relativen next-Link (//evil.example)", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });

    const response = await GET(
      confirmRequest("?token_hash=abc&type=signup&next=//evil.example"),
    );

    expect(response.headers.get("location")).toBe(
      "https://gift-wise.de/dashboard",
    );
  });

  it(
    "ignoriert einen next-Link mit Backslash (manche Parser behandeln " +
      "\\ wie /, Review-Feedback)",
    async () => {
      verifyOtpMock.mockResolvedValue({ error: null });

      const response = await GET(
        confirmRequest(
          "?token_hash=abc&type=signup&next=" +
            encodeURIComponent("/\\evil.example"),
        ),
      );

      expect(response.headers.get("location")).toBe(
        "https://gift-wise.de/dashboard",
      );
    },
  );

  it("leitet bei ungültigem/abgelaufenem Token neutral zur Startseite mit Fehlermeldung weiter", async () => {
    verifyOtpMock.mockResolvedValue({ error: { message: "expired" } });

    const response = await GET(confirmRequest("?token_hash=abc&type=signup"));

    expect(response.headers.get("location")).toContain("/?error=");
  });

  it("ruft verifyOtp nicht auf, wenn token_hash oder type fehlen", async () => {
    await GET(confirmRequest(""));

    expect(verifyOtpMock).not.toHaveBeenCalled();
  });
});
