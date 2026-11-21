import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const runDailyJobsMock = vi.fn();
vi.mock("@/lib/cron/daily-jobs", () => ({
  runDailyJobs: runDailyJobsMock,
}));

const { GET } = await import("./route");

function cronRequest(authorization?: string) {
  return new NextRequest("https://gift-wise.de/api/cron/daily", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("GET /api/cron/daily", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    runDailyJobsMock.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("lehnt eine Anfrage ohne Authorization-Header ab", async () => {
    const response = await GET(cronRequest());

    expect(response.status).toBe(401);
    expect(runDailyJobsMock).not.toHaveBeenCalled();
  });

  it("lehnt eine Anfrage mit falschem Secret ab", async () => {
    const response = await GET(cronRequest("Bearer falsch"));

    expect(response.status).toBe(401);
    expect(runDailyJobsMock).not.toHaveBeenCalled();
  });

  it("führt die Tagesaufgaben bei korrektem Secret aus", async () => {
    runDailyJobsMock.mockResolvedValue([{ name: "a", ok: true }]);

    const response = await GET(cronRequest("Bearer test-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runDailyJobsMock).toHaveBeenCalledOnce();
    expect(body).toEqual({ results: [{ name: "a", ok: true }] });
  });
});
