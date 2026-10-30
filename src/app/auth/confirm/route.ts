import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Nur ein Pfad auf der eigenen Seite, kein absoluter Link - sonst liesse
// sich "next" fuer eine offene Weiterleitung auf eine fremde Domain
// missbrauchen (Codacy-aehnlicher Review-Hinweis, Sicherheitshaertung
// im Rahmen von QA5).
function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}

// Ziel des Bestätigungslinks aus der Supabase-Registrierungs-Mail.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(
      `/?error=${encodeURIComponent("Bestätigungslink ungültig oder abgelaufen")}`,
      request.url,
    ),
  );
}
