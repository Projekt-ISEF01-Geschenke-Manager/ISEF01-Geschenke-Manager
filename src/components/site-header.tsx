import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { signout } from "@/app/actions/auth";

// Gleiche Kopfzeile auf allen Seiten (Wireframe-Annotation "Allgemein").
// badge: zusaetzliche Kennzeichnung, z. B. "Geteilte Ansicht · nur lesen"
// auf der oeffentlichen Teilen-Route (A10) - ersetzt dort den Claim-Text.
// userName: nur auf eingeloggten Seiten gesetzt (Dashboard) - zeigt
// "Angemeldet als" + Abmelden-Button direkt im Header statt verstreut auf
// jeder Unterseite.
export function SiteHeader({ badge, userName }: { badge?: string; userName?: string }) {
  return (
   
<header
  className="border-b border-[#A57878] text-white"
  style={{
    background: "linear-gradient(110deg, #A57878 0%, #D9B9AD 50%, #86666D 100%)",
  }}
>
 
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
        <Link href="/" className="flex items-center gap-4">
         



<img
  src="/giftwise-symbol-transparent.png"
  alt="Giftwise Geschenksymbol"  
className="h-14 w-14 shrink-0 object-contain brightness-0 invert"

/>





<span className="flex flex-col">
 
<span className="text-2xl font-light tracking-[0.18em] text-white">
  GIFTWISE
</span>


 
<span className="text-sm tracking-[0.12em] text-white/90">
  {badge ?? "Klug schenken"}
</span>

</span>


        </Link>
        <div className="flex items-center gap-4">
          {userName && (
            <>
              <span className="hidden text-sm text-white/90 sm:inline">
                Angemeldet als <strong className="font-semibold text-white">{userName}</strong>
              </span>
              <form action={signout}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-full border border-white/70 px-4 py-2 text-sm text-white transition hover:bg-white/10 active:scale-95"
                >
                  Abmelden
                </button>
              </form>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
