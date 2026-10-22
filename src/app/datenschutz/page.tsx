import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Platzhalter: Inhalt muss vor der Abgabe durch eine echte
// Datenschutzerklärung ersetzt werden (Art. 13 DSGVO).
export default function DatenschutzPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">Datenschutzerklärung</h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          TODO: Echte Datenschutzerklärung nach Art. 13 DSGVO ergänzen
          (verantwortliche Stelle, erhobene Daten, Zweck, Speicherdauer,
          Rechte der Nutzer:innen).
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
