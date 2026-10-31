"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAndRecordAttempt, releaseAttempt, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

// Server Actions sind als Endpunkte aufrufbar, nicht nur über das eigene
// Formular - formData.get() kann daher null oder eine File liefern statt
// des erwarteten Strings. Gibt in dem Fall "" zurück statt mit .trim() auf
// null/File zu crashen, sodass die bestehende Validierung greift.
function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export type LoginState = { error?: string; email?: string } | undefined;

// Fehlermeldung bewusst neutral (verrät nicht, ob die E-Mail existiert),
// siehe Wireframe-Annotation zur Anmeldung.
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formString(formData.get("email"));
  const password = formData.get("password") as string;

  // QA5: begrenzte Versuche gegen Passwort-Raten. Pruefen UND reservieren
  // passiert atomar (siehe check_and_record_rate_limit) - ein erfolgreicher
  // Login gibt die Reservierung wieder frei, damit er nie selbst dazu
  // beitraegt, ausgesperrt zu werden; ein fehlgeschlagener laesst sie
  // stehen und zaehlt damit gegen das Limit.
  let attemptId: string | null = null;
  if (email) {
    const rateLimit = await checkAndRecordAttempt("login", email);
    if (rateLimit.limited) {
      return { error: RATE_LIMIT_MESSAGE, email };
    }
    attemptId = rateLimit.attemptId;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-Mail oder Passwort ist falsch.", email };
  }

  if (attemptId) {
    await releaseAttempt(attemptId);
  }

  redirect("/dashboard");
}

export type RegisterState =
  | { error?: string; values?: { name: string; email: string } }
  | undefined;

export async function signup(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = formString(formData.get("name"));
  const email = formString(formData.get("email"));
  const password = formData.get("password") as string;
  const passwordRepeat = formData.get("passwordRepeat") as string;
  const privacyAccepted = formData.get("privacyAccepted") === "on";

  const values = { name, email };

  // Serverseitige Prüfung zusätzlich zur Browser-Validierung, siehe
  // Wireframe-Annotation "Prüfung immer auch auf dem Server".
  if (!name) {
    return { error: "Bitte gib deinen Vornamen ein.", values };
  }
  if (!password || password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein.", values };
  }
  if (password !== passwordRepeat) {
    return { error: "Die Passwörter stimmen nicht überein.", values };
  }
  if (!privacyAccepted) {
    return {
      error: "Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.",
      values,
    };
  }

  // QA5: begrenzte Registrierungsversuche je E-Mail - verhindert, dass
  // wiederholte Versuche fuer dieselbe Adresse Supabases Mail-Ratenlimit
  // fuer Bestaetigungsmails ausloesen (jeder Versuch zaehlt, nicht nur
  // fehlgeschlagene - Supabase verschickt bei jedem signUp eine Mail).
  // Die Reservierung bleibt bewusst stehen (kein release), anders als beim
  // Login.
  if (email) {
    const rateLimit = await checkAndRecordAttempt("register", email);
    if (rateLimit.limited) {
      return { error: RATE_LIMIT_MESSAGE, values };
    }
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message, values };
  }

  redirect("/register/check-email");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Banner "Bitte bestätige deine E-Mail-Adresse" auf der Übersicht
// (DESIGN-DARKMODE.md). Kein eigenes Rate-Limiting wie bei login/register -
// die Server Action ist nur eingeloggten Nutzer:innen zugänglich, das
// anonyme Missbrauchsszenario (QA5) besteht hier nicht.
export async function resendConfirmation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect("/");
    return;
  }

  await supabase.auth.resend({ type: "signup", email: user.email });
}
