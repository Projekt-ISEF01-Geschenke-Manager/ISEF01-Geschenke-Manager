import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FALLBACK_PATH = "/dashboard";

// Supabase haengt den von uns bei resetPasswordForEmail() gesetzten
// redirectTo-Query-String (?next=...) nicht zuverlaessig an den Link in
// der E-Mail an, wenn die URL-Konfiguration im Supabase-Dashboard nur die
// Basis-URL ohne Query-String erlaubt (beobachtet: der verschickte Link
// enthaelt nur token_hash und type, kein next). Deshalb bestimmt das
// Fallback-Ziel sich am "type" der Bestaetigung selbst, statt sich auf
// einen von Supabase durchgereichten next-Parameter zu verlassen.
//
// Als Map statt als Objekt-Literal: "type" kommt roh aus der Query (der
// "as EmailOtpType"-Cast ist nur eine Typ-Behauptung, kein Laufzeit-Check)
// - ein Objekt-Lookup mit einem ungeprueften String-Schluessel koennte
// ueber "__proto__" o.ae. auf die Prototype-Chain zugreifen (Codacy:
// Generic Object Injection Sink). Eine Map kennt dieses Problem nicht.
const DEFAULT_PATH_BY_TYPE = new Map<string, string>([
  ["recovery", "/konto/neues-passwort"],
]);

// Nur ein Pfad auf der eigenen Seite, kein absoluter Link - sonst liesse
// sich "next" fuer eine offene Weiterleitung auf eine fremde Domain
// missbrauchen (Sicherheitshaertung im Rahmen von QA5). Rueckschlag-
// Backslashes koennten von manchen Parsern wie Schraegstriche behandelt
// werden - deshalb per echtem URL-Parsing gegen einen festen Dummy-Origin
// geprueft (Review-Feedback), statt nur den String zu inspizieren.
function safeNextPath(value: string | null, fallback: string): string {
  if (!value || value.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(value, "http://localhost");
    const staysOnSameOrigin = url.origin === "http://localhost";
    const isSingleLeadingSlash =
      value.startsWith("/") && !value.startsWith("//");

    if (!staysOnSameOrigin || !isSingleLeadingSlash) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

// Ziel des Bestätigungslinks aus der Supabase-Registrierungs-Mail.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = (type && DEFAULT_PATH_BY_TYPE.get(type)) || FALLBACK_PATH;
  const next = safeNextPath(searchParams.get("next"), fallback);

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
