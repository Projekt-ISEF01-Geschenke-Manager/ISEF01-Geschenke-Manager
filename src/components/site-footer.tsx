import Link from "next/link";

// Gleiche Fußzeile auf allen Seiten, ohne Login erreichbar
// (Wireframe-Annotation "Footer").
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-100 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-5 sm:flex-row">
        <span>© 2026 Geschenke-Manager · IU-Projekt ISEF01</span>
        <span className="flex gap-4">
          <Link href="/impressum" className="underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="underline">
            Datenschutz
          </Link>
        </span>
      </div>
    </footer>
  );
}
