import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

// "reset" ist schon vorbereitet, wird aber erst mit der Passwort-Reset-
// Funktion selbst verdrahtet (Stufe 2, aktuell nur Platzhalter unter
// /passwort-vergessen).
export type RateLimitAction = "login" | "register" | "reset";

export type RateLimitResult =
  | { limited: true; attemptId: null }
  | { limited: false; attemptId: string };

// QA5: "begrenzte Versuche bei Login, Registrierung und Reset" (Reset
// folgt mit der Passwort-Reset-Funktion, Stufe 2). Zaehlen + Reservieren
// passiert atomar in einer Postgres-Funktion (Review-Feedback: getrennte
// select-count- und insert-Aufrufe hatten eine Race Condition zwischen
// parallelen Anfragen fuer dieselbe E-Mail), siehe die Migration
// 20261030140000_rate_limit_atomic_check.sql. Laeuft ueber den
// Service-Role-Client, weil die Pruefung vor dem Login passiert, also ohne
// auth.uid() - siehe docs/database-schema.md Abschnitt 3.
export async function checkAndRecordAttempt(
  action: RateLimitAction,
  identifier: string,
): Promise<RateLimitResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .rpc("check_and_record_rate_limit", {
      p_action: action,
      p_identifier: identifier,
      p_window_minutes: WINDOW_MINUTES,
      p_max_attempts: MAX_ATTEMPTS,
    })
    .single();

  // Fail closed: ohne verlaessliche Zaehlung lieber blockieren, als ein
  // Rate-Limit durch einen DB-Fehler stillschweigend wirkungslos werden
  // zu lassen (Review-Feedback).
  if (error || !data) {
    return { limited: true, attemptId: null };
  }

  const result = data as unknown as {
    limited: boolean;
    attempt_id: string | null;
  };

  return result.limited
    ? { limited: true, attemptId: null }
    : { limited: false, attemptId: result.attempt_id as string };
}

// Macht eine Reservierung rueckgaengig - fuer einen erfolgreichen Login,
// der nicht gegen das Limit zaehlen soll.
export async function releaseAttempt(attemptId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.rpc("release_rate_limit_attempt", {
    p_attempt_id: attemptId,
  });
}

export const RATE_LIMIT_MESSAGE = `Zu viele Versuche. Bitte warte ${WINDOW_MINUTES} Minuten und versuche es erneut.`;
