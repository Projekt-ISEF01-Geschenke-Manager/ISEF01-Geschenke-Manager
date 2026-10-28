import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Platzhalter: Inhalt muss vor der Abgabe durch ein echtes
// Impressum ersetzt werden (§ 5 DDG).
export default function ImpressumPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">Impressum</h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          TODO: Angaben nach § 5 DDG ergänzen (Name, Anschrift,
          Kontaktmöglichkeit der verantwortlichen Person).
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
