import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const singleMock = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    rpc: (...args: unknown[]) => {
      rpcMock(...args);
      return { single: singleMock };
    },
  }),
}));

const { checkAndRecordAttempt, releaseAttempt } = await import("./rate-limit");

describe("checkAndRecordAttempt", () => {
  beforeEach(() => {
    rpcMock.mockClear();
    singleMock.mockReset();
  });

  it("ruft die atomare Postgres-Funktion mit Aktion, E-Mail, Fenster und Limit auf", async () => {
    singleMock.mockResolvedValue({
      data: { attempt_id: "attempt-1", limited: false },
      error: null,
    });

    await checkAndRecordAttempt("login", "Jakob@Example.de");

    expect(rpcMock).toHaveBeenCalledWith("check_and_record_rate_limit", {
      p_action: "login",
      p_identifier: "Jakob@Example.de",
      p_window_minutes: 15,
      p_max_attempts: 5,
    });
  });

  it("gibt die reservierte attemptId zurück, wenn nicht limitiert", async () => {
    singleMock.mockResolvedValue({
      data: { attempt_id: "attempt-1", limited: false },
      error: null,
    });

    const result = await checkAndRecordAttempt("login", "jakob@example.de");

    expect(result).toEqual({ limited: false, attemptId: "attempt-1" });
  });

  it("ist limitiert, wenn die Funktion limited=true zurückgibt", async () => {
    singleMock.mockResolvedValue({
      data: { attempt_id: null, limited: true },
      error: null,
    });

    const result = await checkAndRecordAttempt("register", "jakob@example.de");

    expect(result).toEqual({ limited: true, attemptId: null });
  });

  it(
    "blockiert (fail closed), wenn die Datenbank einen Fehler zurückgibt - " +
      "ein Rate-Limit soll bei einem DB-Fehler nicht stillschweigend wirkungslos werden",
    async () => {
      singleMock.mockResolvedValue({
        data: null,
        error: { message: "relation does not exist" },
      });

      const result = await checkAndRecordAttempt("login", "jakob@example.de");

      expect(result).toEqual({ limited: true, attemptId: null });
    },
  );
});

describe("releaseAttempt", () => {
  it("ruft die Freigabe-Funktion mit der attemptId auf", async () => {
    rpcMock.mockClear();
    singleMock.mockReset().mockResolvedValue({ data: null, error: null });

    await releaseAttempt("attempt-1");

    expect(rpcMock).toHaveBeenCalledWith("release_rate_limit_attempt", {
      p_attempt_id: "attempt-1",
    });
  });
});
