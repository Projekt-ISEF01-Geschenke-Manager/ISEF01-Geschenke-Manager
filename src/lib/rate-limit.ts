import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;
// Raeumt nebenbei alte Zeilen auf (bei jedem recordAttempt), statt einen
// eigenen Cron-Job dafuer zu brauchen.
const CLEANUP_AFTER_HOURS = 24;

// "reset" ist schon vorbereitet, wird aber erst mit der Passwort-Reset-
// Funktion selbst verdrahtet (Stufe 2, aktuell nur Platzhalter unter
// /passwort-vergessen).
export type RateLimitAction = "login" | "register" | "reset";

// QA5: "begrenzte Versuche bei Login, Registrierung und Reset" (Reset
// folgt mit der Passwort-Reset-Funktion, Stufe 2). Laeuft ueber den
// Service-Role-Client, weil die Pruefung vor dem Login passiert, also ohne
// auth.uid() - siehe docs/database-schema.md Abschnitt 3.
export async function isRateLimited(
  action: RateLimitAction,
  identifier: string,
): Promise<boolean> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_attempts")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
    .eq("identifier", identifier.toLowerCase())
    .gte("created_at", since);

  return (count ?? 0) >= MAX_ATTEMPTS;
}

export async function recordAttempt(
  action: RateLimitAction,
  identifier: string,
): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from("rate_limit_attempts")
    .insert({ action, identifier: identifier.toLowerCase() });

  const cutoff = new Date(
    Date.now() - CLEANUP_AFTER_HOURS * 60 * 60 * 1000,
  ).toISOString();
  await supabase.from("rate_limit_attempts").delete().lt("created_at", cutoff);
}

export const RATE_LIMIT_MESSAGE = `Zu viele Versuche. Bitte warte ${WINDOW_MINUTES} Minuten und versuche es erneut.`;
