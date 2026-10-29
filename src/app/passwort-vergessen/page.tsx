import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Laut Wireframe-Annotation erst "ab Stufe 2" nötig (braucht eigenen
// Mailversand-Flow). Platzhalter, bis das umgesetzt wird.
export default function PasswortVergessenPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold">Passwort vergessen</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Diese Funktion ist noch nicht verfügbar und folgt in einer späteren
          Ausbaustufe.
        </p>
        <Link href="/" className="text-sm underline">
          Zurück zur Startseite
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
