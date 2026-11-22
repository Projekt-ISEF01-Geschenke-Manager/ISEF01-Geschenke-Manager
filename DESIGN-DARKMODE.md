# Design-System: Farben, Komponenten, Hell-/Dunkelmodus

Stand: Redesign (moderner, klarer, einheitlich). Alle Werte stehen als
CSS-Variablen in `src/app/globals.css` und sind in Tailwind als Farben
verfuegbar (`bg-card`, `text-muted`, `border-line`, ...). Rohe
`neutral-*`/`red-*`/`green-*`-Klassen und `dark:`-Farbpaare werden nicht mehr
verwendet - der Dunkelmodus wechselt allein ueber die Tokens
(`[data-theme="dark"]`).

## Richtung
Kuehle Neutraltoene als Flaeche, ein einziger Beeren-Akzent (`--accent`,
`--btn-bg`), klare Linien (`--line`), Geist als Schrift. Kontrast Text/Flaeche
mindestens 4,5:1, in beiden Modi getrennt abgestimmt.

## Tokens
- Flaechen: `bg`, `card`, `tile`, `subtle`, `hover`, `input-bg`
- Linien: `line`, `card-border`, `input-border`, `rule`
- Text: `text`, `heading`, `lead`, `muted`, `accent`
- Status: `danger` / `danger-bg` / `danger-line`, `success` / `success-bg` / `success-line`
- Header: `header-bg`, `on-header*` (gleiche Struktur in beiden Modi)

## Buttons (einheitlich, zentral in globals.css)
`btn` + Variante `btn-primary | btn-secondary | btn-outline | btn-danger |
btn-danger-outline`, optional `btn-sm`. Hover (nur bei Zeigergeraeten), Aktiv
(leichtes Eindruecken), Deaktiviert und sichtbarer Tastaturfokus sind fuer
alle identisch; Uebergang 150 ms, `prefers-reduced-motion` wird beachtet.

## Formularfelder und Hinweise
Felder: `rounded-lg border border-input-border bg-input-bg` mit Fokusring.
Fehler-/Erfolgshinweise nutzen `*-bg`, `*-line` und die Textfarbe des Status.

## Farbpaletten (Auswahl im Header)
Sechs Paletten (`rose` = Standard, `klassisch` = frueheres Design mit Header-Farbverlauf, `beere`, `ozean`, `salbei`, `graphit`), je mit
eigenem Hell- und Dunkelmodus. Sie setzen alle dieselben Tokens ueber
`data-palette` (+ `data-theme`) auf `<html>`; neue Palette = ein Block in
`globals.css` plus ein Eintrag in `PALETTES` (`palette-picker.tsx`).
Gespeichert wird pro Geraet in `localStorage` (`palette`).

## Flaechen und Hover
`.surface` = Karte mit Rand und Schatten auf getoenetem Seitengrund.
`.surface-interactive` (klickbare Karten): Hover hebt 2 px an, Akzent-Rand,
staerkerer Schatten; `.surface-dashed` faerbt sich akzentweich. Nur bei
Zeigergeraeten, 160 ms, ohne Bewegung bei `prefers-reduced-motion`.
