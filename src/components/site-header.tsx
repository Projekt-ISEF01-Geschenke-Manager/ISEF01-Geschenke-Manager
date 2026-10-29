import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

// Gleiche Kopfzeile auf allen Seiten (Wireframe-Annotation "Allgemein").
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-neutral-900 text-white dark:border-neutral-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
        <Link href="/" className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-neutral-800 text-xs text-neutral-400">
            Logo
          </span>
          <span>
            <span className="block text-xl font-semibold">Geschenke-Manager</span>
            <span className="block text-sm text-neutral-300">
              Ideen, Anlässe und Geschenke an einem Ort
            </span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
