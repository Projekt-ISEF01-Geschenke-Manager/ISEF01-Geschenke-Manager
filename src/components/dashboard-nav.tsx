"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListChecks, Settings, Share2 } from "lucide-react";

// Hauptnavigation des Dashboards. Ermittelt den aktiven Tab selbst ueber
// usePathname(), statt einen active-Prop von jeder Seite zu verlangen.
//
// - Ab sm (Desktop/Tablet): Tabs mit Symbol im Header (nav-Slot von
//   SiteHeader); eine Markierung gleitet beim Wechsel zum aktiven Tab.
// - Darunter (Handy): schwebende, runde Leiste (wie bei iOS) mit Symbol + Text, gut
//   mit dem Daumen erreichbar; eine Pille gleitet zum aktiven Tab.
//   Das Dashboard-Layout haengt einen Platzhalter unter den Inhalt, damit
//   nichts verdeckt wird.
// "Gesamtliste" ist Teil der Spezifikation, existiert aber noch nicht als
// eigene Route - bewusst als nicht-klickbarer Platzhalter mit "bald"-Hinweis
// statt auf eine 404-Seite zu verlinken.
//
// Es ist immer nur eine der beiden Navs sichtbar (die andere ist display:
// none und damit auch fuer Screenreader weg) - kein doppelter Landmark.
const TABS = [
  { key: "uebersicht", href: "/dashboard", label: "Übersicht", Icon: LayoutGrid },
  { key: "gesamtliste", href: null, label: "Gesamtliste", Icon: ListChecks },
  { key: "teilen", href: "/dashboard/teilen", label: "Geteilte Links", Icon: Share2 },
] as const;

// Einstellungen: auf Desktop kein Haupt-Tab (eigenes Icon im Header,
// siehe site-header.tsx), auf Mobile aber vierter Eintrag der unteren
// Tabbar - deshalb eigene Konstante statt in TABS.
const SETTINGS_TAB = { key: "einstellungen", href: "/dashboard/einstellungen", label: "Einstellungen", Icon: Settings };
const MOBILE_TABS = [...TABS, SETTINGS_TAB];

function activeKey(pathname: string) {
  if (pathname === "/dashboard") return "uebersicht";
  if (pathname.startsWith("/dashboard/teilen")) return "teilen";
  if (pathname.startsWith("/dashboard/einstellungen")) return "einstellungen";
  return null;
}

export function DashboardNav() {
  const pathname = usePathname();
  const active = activeKey(pathname);
  // Fuer die mobile Tabbar (4 Eintraege inkl. Einstellungen) - der Desktop-
  // nav-glider ermittelt seine Position stattdessen direkt per DOM
  // (aria-current), siehe place() unten.
  const activeIndex = MOBILE_TABS.findIndex((tab) => tab.key === active);

  const navRef = useRef<HTMLElement>(null);
  const gliderRef = useRef<HTMLSpanElement>(null);
  const placedOnce = useRef(false);

  // Header-Markierung unter den aktiven Tab legen (direkt am DOM, kein
  // State): erste Platzierung ohne Animation, danach gleitet sie.
  useEffect(() => {
    function place() {
      const nav = navRef.current;
      const glider = gliderRef.current;
      if (!nav || !glider) return;
      const current = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current || current.offsetWidth === 0) {
        glider.style.opacity = "0";
        return;
      }
      glider.style.width = `${current.offsetWidth}px`;
      glider.style.transform = `translateX(${current.offsetLeft}px)`;
      glider.style.opacity = "1";
      if (!placedOnce.current) {
        placedOnce.current = true;
        requestAnimationFrame(() => {
          glider.style.transition =
            "transform 280ms cubic-bezier(0.2, 0, 0, 1), width 280ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms";
        });
      }
    }
    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
    };
  }, [pathname]);

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Hauptnavigation"
        className="relative hidden gap-1 sm:flex"
      >
        <span ref={gliderRef} aria-hidden="true" className="nav-glider" />
        {TABS.map(({ key, href, label, Icon }) =>
          href ? (
            <Link
              key={key}
              href={href}
              aria-current={active === key ? "page" : undefined}
              className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap text-white transition duration-150 ${
                active === key ? "font-semibold" : "hover:bg-black/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ) : (
            <span
              key={key}
              aria-disabled="true"
              className="relative z-10 flex cursor-not-allowed items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap text-white/70"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              <span className="rounded-full border border-white/40 px-1.5 text-[10px] leading-4">
                bald
              </span>
            </span>
          ),
        )}
      </nav>

      <nav
        aria-label="Hauptnavigation"
        className="tabbar surface fixed inset-x-4 z-40 rounded-full p-1.5 shadow-pop sm:hidden"
      >
        <div className="relative grid grid-cols-4">
          {activeIndex >= 0 && (
            <span
              aria-hidden="true"
              className="tabbar-glider"
              style={{ "--tab-index": activeIndex } as React.CSSProperties}
            />
          )}
          {MOBILE_TABS.map(({ key, href, label, Icon }) =>
            href ? (
              <Link
                key={key}
                href={href}
                aria-current={active === key ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition-colors duration-150 active:scale-95 ${
                  active === key ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ) : (
              <span
                key={key}
                aria-disabled="true"
                className="relative flex h-14 cursor-not-allowed flex-col items-center justify-center gap-0.5 rounded-full text-[11px] text-muted opacity-60"
              >
                <Icon className="h-5 w-5" />
                {label} · bald
              </span>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
