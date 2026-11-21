import "server-only";

export type DailyJob = {
  name: string;
  run: () => Promise<void>;
};

export type DailyJobResult = {
  name: string;
  ok: boolean;
  error?: string;
};

// Jede Aufgabe laeuft unabhaengig: ein Fehler in einer Aufgabe (z. B.
// E-Mail-Erinnerungen) darf die anderen (z. B. das Loeschen unbestaetigter
// Konten) nicht verhindern.
export async function runDailyJobs(
  jobs: DailyJob[],
): Promise<DailyJobResult[]> {
  const results: DailyJobResult[] = [];

  for (const job of jobs) {
    try {
      await job.run();
      results.push({ name: job.name, ok: true });
    } catch (error) {
      results.push({
        name: job.name,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
