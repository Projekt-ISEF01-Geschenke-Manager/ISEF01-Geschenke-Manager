import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ScrollReveal } from "@/components/scroll-reveal";
import { DEFAULT_PALETTE, THEME_COLORS, getThemeColor } from "@/lib/theme-color";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Geschenke-Manager",
  description: "Ideen, Anlässe und Geschenke an einem Ort.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // SSR-Default fuer iOS Safari (Statusleiste/Oberflaechenfarbe, #208):
  // Standardpalette, Hellmodus. Das Inline-Script unten korrigiert das
  // Tag vor dem ersten Paint auf die tatsaechlich gespeicherte Wahl.
  themeColor: getThemeColor(DEFAULT_PALETTE, "light"),
};

// Setzt data-theme VOR dem ersten Paint (gespeicherte Wahl oder
// System-Präferenz), damit die Seite nicht kurz im falschen Theme aufblitzt.
// Aktualisiert dabei auch das theme-color-Meta-Tag (#208) - die Farbtabelle
// kommt aus theme-color.ts, damit sie nicht doppelt gepflegt werden muss.
const themeInitScript = `(function() {
  try {
    var colors = ${JSON.stringify(THEME_COLORS)};
    var defaultPalette = ${JSON.stringify(DEFAULT_PALETTE)};
    var stored = localStorage.getItem("theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("reveal-ready");
    var storedPalette = localStorage.getItem("palette");
    if (storedPalette) document.documentElement.setAttribute("data-palette", storedPalette);
    var entry = colors[storedPalette] || colors[defaultPalette];
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? entry.dark : entry.light);
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-full flex flex-col"><ScrollReveal />
        {children}
      </body>
    </html>
  );
}
