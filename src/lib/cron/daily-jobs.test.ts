import { describe, it, expect, vi } from "vitest";
import { runDailyJobs } from "./daily-jobs";

describe("runDailyJobs", () => {
  it("führt alle Aufgaben aus und meldet sie als erfolgreich", async () => {
    const jobA = vi.fn().mockResolvedValue(undefined);
    const jobB = vi.fn().mockResolvedValue(undefined);

    const results = await runDailyJobs([
      { name: "a", run: jobA },
      { name: "b", run: jobB },
    ]);

    expect(jobA).toHaveBeenCalledOnce();
    expect(jobB).toHaveBeenCalledOnce();
    expect(results).toEqual([
      { name: "a", ok: true },
      { name: "b", ok: true },
    ]);
  });

  it("isoliert eine fehlgeschlagene Aufgabe, ohne die anderen zu verhindern", async () => {
    const jobA = vi.fn().mockRejectedValue(new Error("kaputt"));
    const jobB = vi.fn().mockResolvedValue(undefined);

    const results = await runDailyJobs([
      { name: "a", run: jobA },
      { name: "b", run: jobB },
    ]);

    expect(jobB).toHaveBeenCalledOnce();
    expect(results).toEqual([
      { name: "a", ok: false, error: "kaputt" },
      { name: "b", ok: true },
    ]);
  });

  it("gibt eine leere Liste zurück, wenn keine Aufgaben übergeben werden", async () => {
    const results = await runDailyJobs([]);

    expect(results).toEqual([]);
  });

  it("behandelt einen geworfenen Nicht-Error-Wert als String", async () => {
    const results = await runDailyJobs([
      { name: "a", run: () => Promise.reject("string-fehler") },
    ]);

    expect(results).toEqual([{ name: "a", ok: false, error: "string-fehler" }]);
  });
});
