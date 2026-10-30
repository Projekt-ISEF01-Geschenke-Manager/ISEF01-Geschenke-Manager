# Dark-/Light-Mode-Design: Startseite/Login

Abgestimmte Spezifikation (Design-Team, 30.10.2026) für den Hell-/Dunkelmodus
der Startseite (`/`, Landingpage + Login) und der Registrierungsseite. Der
Header (`SiteHeader`, Giftwise-Branding) ist davon **nicht** betroffen und
bleibt unverändert.

## CSS-Variablen

```css
:root {
  /* Hellmodus (Standard) */
  --bg: #faf6f4;
  --bg-fade-top: #eddfda;
  --tile: #f1e8e4;
  --card: #ffffff;
  --card-border: #dccfca;
  --input-bg: #ffffff;
  --input-border: #a8979a;
  --text: #2a2123;
  --heading: #241b1d;
  --h1: #1f1719;
  --lead: #4f4244;
  --muted: #5f5254;
  --accent: #8a5a66;
  --btn-bg: #6f4a55;
  --btn-text: #ffffff;
  --tag-text: #6b4d55;
  --tag-border: #cdbab5;
  --rule: #e3d6d2;
}

[data-theme="dark"] {
  --bg: #121113;
  --bg-fade-top: #261f21;      /* Verlauf unter dem Header, 300px lang */
  --tile: #1a1819;             /* Feature-Karten, Hinweis-Box */
  --card: #221e1f;             /* Login-/Registrierungs-Karte */
  --card-border: #4a4244;
  --input-bg: #121113;
  --input-border: #6a6063;
  --text: #f3eeed;
  --heading: #f8f3f1;
  --h1: #fbf7f5;
  --lead: #d0c4c1;
  --muted: #c2b8b6;
  --accent: #d5b9ac;           /* Links, Outline-Button, "Hinweis" */
  --btn-bg: #d5b9ac;
  --btn-text: #231a1c;
  --tag-text: #dcc6bc;
  --tag-border: #5c5255;
  --rule: #4a4244;
}

/* Header bleibt in beiden Modi gleich (unveraendert) */
--header-gradient: linear-gradient(90deg, #a88b8c 0%, #d5b9ac 50%, #876a71 100%);
--focus-ring: #c08a9a;
```

## Struktur (Startseite/Login)

- **Hintergrund:** Unter dem Header läuft die Seite per
  `linear-gradient(180deg, var(--bg-fade-top) 0, var(--bg) 300px)` aus.
- **Hero:** Keine Box mehr um "Nie wieder Last-Minute-Geschenke" - Überschrift
  38px, Fließtext 16px, direkt auf dem Seitenhintergrund.
- **Karten:** Feature-Karten und die "Hinweis"-Box **ohne Rahmen**, Radius
  14px (Hinweis: 12px), Padding 20px, Hintergrund `--tile`. Die
  Login-/Registrierungs-Karte hat einen 1px-Rahmen (`--card-border`) und
  Radius 16px, Hintergrund `--card`.
- **Buttons & Inputs:** Buttons pill-förmig (Radius 999px, min. 44px hoch).
  Inputs 44px hoch, Radius 8px.
- **Schalter (ersetzt den bisherigen Mond-Icon-Button):** 68×36px, Pill mit
  weißem 1px-Rahmen und `rgba(255,255,255,0.2)` Hintergrund. Weiße Kugel
  (28px) steht im Dunkelmodus rechts, im Hellmodus links. `role="switch"` +
  `aria-label`. Speichert die Wahl in `localStorage` (Standard:
  `prefers-color-scheme`, bestehendes Verhalten bleibt).

## Umsetzungs-Hinweis

Die Farben laufen über CSS-Variablen im bestehenden Theme
(`src/app/globals.css`, `data-theme`-Attribut), nicht hartkodiert in
einzelnen Komponenten - vermeidet ein zweites, paralleles Farbsystem.
