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

## Animationen
Alle Animationen laufen zentral ueber CSS-Klassen aus `globals.css` bzw.
kleine Hooks in `src/lib/`; es werden keine Einzelanimationen pro Komponente
gebaut. Ueberall gilt: 150-350 ms, nur Opacity/Transform/Groesse, nie reine
Farbe allein, und `prefers-reduced-motion` wird beachtet (globaler
Reduced-Motion-Block in `globals.css` kappt alle Transition-/Animation-Dauern
auf ~0; einzelne Hooks pruefen das zusaetzlich selbst ueber `canAnimate()`,
`src/lib/motion.ts`).

- **Scroll-Reveal** (`reveal`-Klasse, `src/components/scroll-reveal.tsx`):
  Elemente blenden beim Hereinscrollen ein (Opacity + leichter Versatz nach
  oben), leicht gestaffelt ueber einen `IntersectionObserver`; neu eingefuegte
  Elemente (Routenwechsel, Listen) werden per `MutationObserver` nachtraeglich
  erfasst. Alle `surface`-Elemente haben die Klasse bereits. Nur aktiv mit
  `html.reveal-ready` (Inline-Script in `layout.tsx`, nicht bei Reduced
  Motion/ohne JS - dann bleibt alles sofort sichtbar).
- **Entfernen aus Listen** (`useRemoveAnimation`, `src/lib/use-remove-animation.ts`):
  `start()` beim Absenden des Loeschens aufrufen - das Element schrumpft
  (Hoehe, Innen-/Aussenabstand, Randbreite), blendet aus und zieht den
  Listenabstand mit ein, damit nichts springt; `cancel()` bei Fehlschlag, dann
  bleibt das Element wie vorher. Muster siehe `gift-item.tsx`/`person-card.tsx`.
- **Popups**: `Modal` (`src/components/modal.tsx`, HTML `<dialog>` + Klasse
  `app-dialog`) blendet beim Oeffnen/Schliessen ein/aus (Opacity + Skalierung,
  inkl. Backdrop). Meldungen laufen ueber `Toast` (`src/components/toast.tsx`,
  Klassen `toast-in`/`toast-out`).
- **Statuswechsel** (`useStatusAnimation`, `src/lib/use-status-animation.ts`):
  liefert beim Umschalten offen/besorgt kurz `status-done` bzw. `status-undo`
  (z. B. Hakerl-Puls in `gift-item.tsx`), nicht beim ersten Rendern.
- **Aufklappende Bereiche**: Klasse `anim-in` (z. B. Fehlermeldungen,
  zusaetzliche Formularfelder).
- **Formulare**: `form-stagger` auf dem Formular-Container staffelt das
  Einblenden der Kind-Elemente; `form-out` fuer das Abbrechen/Schliessen ohne
  Animation, wenn keine sinnvoll ist; `form-shake` auf Validierungsfehler;
  `card-saved` kurz nach erfolgreichem Speichern. Muster siehe
  `gift-item.tsx`/`person-card.tsx`.

## Skeletons
`loading.tsx`-Dateien bauen den echten Seitenaufbau nach (keine generische
Spinner-Seite) mit Bausteinen aus `src/components/skeleton.tsx`
(`SkeletonRegion`, `Skeleton`, Karten in `.surface`). Platzhalter-Flaechen
nutzen die Klassen `skeleton`/`skeleton-round` (schimmernder Verlauf per
`::after`) und blenden beim Nachladen der echten Inhalte sanft aus
(`skeleton-fade`). Kein `animate-pulse`.

## Navigation
`DashboardNav` (`src/components/dashboard-nav.tsx`) zeigt die Dashboard-Bereiche
als Header-Tabs mit Symbol; ab `sm`-Breite gleitet eine Markierung
(`.nav-glider`) unter dem aktiven Tab mit, auf dem Handy wird daraus eine
schwebende runde Tabbar am unteren Rand (`.tabbar`/`.tabbar-glider`, gleiches
Gleit-Prinzip). Neue Dashboard-Bereiche werden dort in der `TABS`-Liste
ergaenzt.

## Verbindliche Kurzfassung
Die kompakte, fuer neue UI verbindliche Fassung dieser Regeln (Tokens statt
roher Farben, welche Klasse fuer was) steht in `AGENTS.md` unter
"Design-System". Dieses Dokument hier ist die ausfuehrliche Referenz dazu.
