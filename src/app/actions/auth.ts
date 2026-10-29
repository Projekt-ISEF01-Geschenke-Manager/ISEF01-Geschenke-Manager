"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string } | undefined;

// Fehlermeldung bewusst neutral (verrät nicht, ob die E-Mail existiert),
// siehe Wireframe-Annotation zur Anmeldung.
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-Mail oder Passwort ist falsch.", email };
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
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
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
