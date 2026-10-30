import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LoginForm } from "@/components/login-form";

const features = [
  {
    title: "Ideen in Sekunden festhalten",
    description:
      "Speichere Geschenkideen mit Notiz, Link oder Bild, sobald sie dir einfallen.",
    tag: "Text, Link, Bild",
  },
  {
    title: "Alles pro Person im Blick",
    description:
      "Sieh auf einen Blick, was du jemandem schon geschenkt hast und was noch offen ist.",
    tag: "Ideen + frühere Geschenke",
  },
  {
    title: "Rechtzeitig erinnert",
    description:
      "Erhalte automatisch eine E-Mail vor Geburtstagen und Weihnachten.",
    tag: "per E-Mail",
  },
  {
    title: "Ideen sicher teilen",
    description:
      "Teile ausgewählte Geschenkideen per Link – ganz ohne Konto für die andere Person.",
    tag: "ohne Anmeldung für Empfänger",
  },
  {
    title: "Vorschläge bei Ideenlosigkeit",
    description:
      "Keine Idee? Lass dir Vorschläge auf Basis bisheriger Geschenke anzeigen.",
    tag: "bis zu 5 Vorschläge",
  },
  {
    title: "Deine Daten bleiben bei dir",
    description:
      "Keine Weitergabe an Dritte, keine Werbung, keine KI-Auswertung deiner Daten.",
    tag: "keine KI, keine Werbung",
  },
];

// Liest searchParams (z. B. Fehlermeldung vom Bestätigungslink) -> kann
// nicht statisch vorgerendert werden (Next.js 16 "Cache Components").
export const instant = false;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Logo/Startseite soll bei bestehender Session direkt zur Übersicht
  // führen, statt die Landingpage/Login nochmal zu zeigen.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <SiteHeader />

      {/* Verlauf unter dem Header, siehe DESIGN-DARKMODE.md. */}
      <main
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10"
        style={{
          background:
            "linear-gradient(180deg, var(--bg-fade-top) 0, var(--bg) 300px)",
        }}
      >
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-[38px] leading-tight font-semibold text-h1">
              Nie wieder Last-Minute-Geschenke
            </h1>
            <p className="text-base text-lead">
              Halte Geschenkideen fest, sobald sie dir einfallen, und lass dich
              rechtzeitig vor Geburtstagen und Weihnachten erinnern.
            </p>
            <Link
              href="/register"
              className="w-fit cursor-pointer rounded-full border border-accent px-5 py-3 text-sm font-medium text-accent transition hover:bg-accent/10 active:scale-95"
            >
              Kostenlos Konto erstellen
            </Link>
          </div>

          <LoginForm />
        </div>

        <div className="flex items-start gap-3 rounded-[12px] bg-tile p-5 text-sm">
          <span className="font-medium text-accent">Hinweis</span>
          <span className="text-muted">
            Dein Konto ist privat. Personen, Ideen und Geschenke siehst nur du.
            Geteilt wird nur, was du selbst per Link freigibst.
          </span>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-heading">
            So funktioniert der Geschenke-Manager
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[14px] bg-tile p-5"
              >
                <h3 className="font-medium text-heading">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">
                  {feature.description}
                </p>
                <span className="mt-3 inline-block rounded-full border border-tag-border px-2.5 py-1 text-xs text-tag-text">
                  {feature.tag}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
