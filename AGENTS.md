<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design-System (verbindlich für neue UI)

Details und Werte: `DESIGN-DARKMODE.md`, Tokens und Komponenten in `src/app/globals.css`.

- **Farben nur über Tokens** (`bg-card`, `text-muted`, `border-line`, `text-accent`, `bg-danger-bg` ...). Keine rohen Tailwind-Farben (`neutral-*`, `red-*`, `green-*`, Hex-Werte) und keine `dark:`-Farbpaare in Komponenten. Hell/Dunkel und alle Paletten (`data-palette`: klassisch, rose, beere, ozean, salbei, graphit) laufen allein über die Tokens.
- **Neue Palette** = ein Hell- und ein Dunkel-Block in `globals.css` plus Eintrag in `PALETTES` (`src/components/palette-picker.tsx`).
- **Buttons:** `btn` + `btn-primary | btn-secondary | btn-outline | btn-danger | btn-danger-outline`, optional `btn-sm`. Keine eigenen Hover-/Aktiv-Effekte pro Button.
- **Karten/Boxen:** `surface` (Rand + Schatten); klickbare Karten zusätzlich `surface-interactive`, gestrichelte Platzhalter `surface-dashed`. Hover nur bei Zeigergeräten, 150-200 ms, `prefers-reduced-motion` beachten.
- **Eingabefelder:** `rounded-lg border border-input-border bg-input-bg` mit Fokusring (`focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25`).
- **Status-Hinweise:** `danger-*` / `success-*`-Tokens, nie nur Farbe (immer Text/Icon dazu).
- **Header:** Hintergrund kommt aus `--header-bg` (einfarbig oder Verlauf je Palette).
- Texte mindestens 4,5:1 Kontrast, in beiden Modi und jeder Palette.
- **Scroll-Animation:** Boxen/Karten bekommen die Klasse `reveal` (alle `surface`-Elemente haben sie bereits). `ScrollReveal` blendet sie beim Hereinscrollen ein (350 ms, gestaffelt, nur Opacity/Transform) und beachtet `prefers-reduced-motion`. Keine eigenen Scroll-Animationen pro Komponente bauen.
