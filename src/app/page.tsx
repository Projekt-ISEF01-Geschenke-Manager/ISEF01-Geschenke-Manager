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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <section className="grid gap-6 rounded-2xl border border-neutral-300 p-6 dark:border-neutral-700 md:grid-cols-2 md:p-8">
          <div className="flex flex-col justify-center gap-4">
            <h1 className="text-3xl font-semibold">
              Nie wieder Last-Minute-Geschenke
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Halte Geschenkideen fest, sobald sie dir einfallen, und lass dich
              rechtzeitig vor Geburtstagen und Weihnachten erinnern.
            </p>
            <Link
              href="/register"
              className="cursor-pointer transition active:scale-95 w-fit rounded-full border border-neutral-900 px-5 py-3 text-sm font-medium hover:bg-neutral-100 dark:border-white dark:hover:bg-neutral-800"
            >
              Kostenlos Konto erstellen
            </Link>
          </div>

          <LoginForm />
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="font-medium">Hinweis</span>
          <span className="text-neutral-600 dark:text-neutral-400">
            Dein Konto ist privat. Personen, Ideen und Geschenke siehst nur du.
            Geteilt wird nur, was du selbst per Link freigibst.
          </span>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold">
            So funktioniert der Geschenke-Manager
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {feature.description}
                </p>
                <span className="mt-3 inline-block rounded-full border border-neutral-300 px-2.5 py-1 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
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
