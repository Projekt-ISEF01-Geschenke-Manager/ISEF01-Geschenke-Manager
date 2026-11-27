# ISEF01-Geschenke-Manager (Giftwise)

Projekt im Kurs ISEF01 – Projekt Software Engineering (IU Internationale Hochschule).
Thema E: Geschenke-Manager.

Live: [gift-wise.de](https://gift-wise.de)

## Worum geht's

Giftwise hilft dabei, Geschenkideen für Freunde und Familie über das Jahr hinweg
festzuhalten, statt sie kurz vor Weihnachten oder dem Geburtstag aus dem Gedächtnis
zusammenzusuchen. Pro Person legt man Ideen mit Titel, Link und Anlass an, markiert sie
als offen oder schon besorgt, und kann die Liste per Link mit anderen teilen (z. B.
Geschwistern), damit niemand dasselbe Geschenk doppelt kauft.

## Funktionen

### Konto
- Registrierung mit E-Mail-Bestätigung, Login, Passwort zurücksetzen (neutrale
  Fehlermeldungen, damit nicht erkennbar ist, ob eine E-Mail existiert)
- Rate-Limiting bei Login/Registrierung/Reset (QA5)
- Unbestätigte Konten werden nach 7 Tagen automatisch gelöscht (täglicher Cron-Job)

### Personen & Geschenkideen
- Personen anlegen mit Geburtstag (Tag/Monat Pflicht, Jahr optional), Interessen-Tags
  und Notizen
- Übersicht zeigt anstehende Anlässe (Geburtstage, Weihnachten) mit Countdown und
  Fortschritt ("X von Y schon besorgt")
- Personenseite pro Person: Ideen mit Titel, Link und Anlass anlegen (Schnelleingabe
  oder ausführliches Formular), Status offen/besorgt per Klick umschalten, bearbeiten,
  mit Sicherheitsabfrage löschen
- Besorgte Geschenke zu Geburtstag/Weihnachten rutschen automatisch in die
  „Frühere Geschenke"-Liste, sobald der Anlass vorbei ist; Geschenke ohne festes
  Datum (eigene Anlässe, ohne Anlass) lassen sich manuell über „+ Geschenk
  nachtragen" ergänzen ([#26](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/26),
  [#21](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/21))
- Platzhalter für geplante Erweiterungen (Vorschläge, Bild-Upload, Aufgaben-Checkliste)
  sind in der UI schon vorgesehen, aber noch nicht funktional

### Geteilte Ansicht
- Ideen für eine oder mehrere Personen per Link teilen – ganz ohne Konto für die
  andere Seite (Token-basiert, kein Login nötig)
- Besucher:innen des Links können Ideen ebenfalls als besorgt markieren, optional mit
  Namensangabe ("Max hat das schon besorgt"), damit sich mehrere Leute beim Schenken
  abstimmen können – inklusive serverseitiger Prüfung, dass nur Ideen der über diesen
  Link freigegebenen Personen geändert werden können, und eigenem Rate-Limiting
- Link jederzeit widerrufbar

### Einstellungen
- Eigene Seite (Desktop: Icon im Header neben "Abmelden"; Mobile: eigener Tab in der
  unteren Navigation)
- Kontoweite Schalter: Geburtstagserinnerung per E-Mail an/aus, Weihnachts-Status an/aus
- Pro Person: "In Erinnerungen einschließen" (schließt einzelne Personen aus beiden
  Mail-Typen aus)
- "Bewegung reduzieren" – erzwingt reduzierte Animationen unabhängig von der
  Betriebssystem-Einstellung
  ([#209](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/209))

### Sonstiges
- Dark-/Light-Mode (Theme-Color folgt jetzt auch in der iOS-Statusleiste,
  [#208](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/208))
- Admin-Account: eigene Konten-Übersicht mit Lösch-Funktion, über die
  Einstellungsseite erreichbar, nur für als Admin markierte Konten sichtbar
  ([#90](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/90))
- Impressum, Datenschutzerklärung
- Responsive (Desktop, Tablet, Mobile)

## Stand des Projekts

MVP (IM-4.1) ist umgesetzt, Stufe 2 (IM-4.2) teilweise:

|     | Bereich | Details |
| --- | --- | --- |
| ✅ | Konto | Registrierung/Login mit Rate-Limiting, E-Mail-Bestätigung, Passwort zurücksetzen, automatische Löschung unbestätigter Konten |
| ✅ | Personen & Anlässe | Personen verwalten (Geburtstag, Interessen, Notizen), feste Anlässe (Geburtstag/Weihnachten) |
| ✅ | Geschenkideen | Schnelleingabe mit Link/Anlass, Bearbeiten, Status offen/besorgt, Lösch-Bestätigung, Übersichts- und Personenseite nach Wireframe |
| ✅ | Frühere Geschenke | Idee → Geschenk umwandeln inkl. automatischem Übergang nach dem Anlass und manuellem Nachtragen ([#26](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/26), [#21](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/21)) |
| ✅ | Teilen | Ideen per Link teilen inkl. gemeinsamem Abhaken mit Namenszuordnung |
| ✅ | E-Mail-Erinnerungen | Monatliche Geburtstagserinnerung inkl. Einstellungsseite ([#3](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/3)), Weihnachts-Statusübersicht an drei festen Terminen ([#2](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/2)) |
| ✅ | Admin | Konten-Übersicht mit Lösch-Funktion ([#90](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/90)) |
| ✅ | Design | Dark-/Light-Mode, wählbare Farbpaletten |
| ❌ | Geplant (Stufe 2/3) | eigene Anlässe, Bild-Upload, Aufgaben-Checkliste, regelbasierte Ideenvorschläge, Wichtel-Funktion ([#178](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/178)) |

Siehe [CHANGELOG.md](CHANGELOG.md) für die chronologische Liste gemergter Änderungen
und das [GitHub-Projekt](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/milestones)
für den aktuellen Stand je Meilenstein.

1128 automatisierte Vitest-Tests (`npm test`), CI (Lint + Build), Codacy, CodeQL und
Mutation-Testing (Stryker, `npm run test:mutation`, ~4 Minuten) laufen auf jedem
Pull Request, siehe
[#194](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/194).

## Stack

- [Next.js](https://nextjs.org) (TypeScript, App Router, Server Actions) – Frontend + Backend
- [Tailwind CSS](https://tailwindcss.com) – Styling
- [Supabase](https://supabase.com) – Datenbank (PostgreSQL), Authentifizierung, Row Level Security
- [Resend](https://resend.com) – Transaktions-E-Mails (Bestätigung, Passwort-Reset,
  monatliche Geburtstagserinnerung, Weihnachts-Statusübersicht)
- [Vercel](https://vercel.com) – Hosting, Cron Jobs (täglicher Konten-Cleanup,
  monatlicher Versand der Geburtstagserinnerungen, Weihnachts-Statusübersicht an drei
  festen Terminen)
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) – Tests

## Setup

1. Dependencies installieren:
   ```bash
   npm install
   ```
2. `.env.example` nach `.env.local` kopieren und Werte eintragen (Supabase-Projekt-URL/-Keys aus dem Supabase-Dashboard, Resend-API-Key, ein zufälliges `CRON_SECRET`):
   ```bash
   cp .env.example .env.local
   ```
3. Dev-Server starten:
   ```bash
   npm run dev
   ```
   Läuft dann unter [http://localhost:3000](http://localhost:3000).
4. Tests, Lint und Build:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

## Projektstruktur

```
src/
  app/                    Next.js App Router (Seiten, Server Actions)
    actions/              Server Actions (auth, people, gifts, shared-links, shared-gifts)
    api/cron/daily/       Täglicher Cron-Endpunkt (Konten-Cleanup, per CRON_SECRET geschützt)
    dashboard/            Übersicht, Personenseite, Ideen-teilen-Formular
    teilen/[token]/       Öffentliche, anonyme Ansicht geteilter Ideen
  components/             UI-Komponenten
  lib/
    supabase/             Supabase-Client (Browser, Server, Service-Role)
    cron/                 Cron-Jobs (z. B. unbestätigte Konten löschen)
    rate-limit.ts         Zentrales Rate-Limiting (Login/Registrierung/Reset/geteilte Ansicht)
  proxy.ts                Next.js 16 Nachfolger von middleware.ts - hält die Auth-Session aktuell
supabase/
  migrations/             SQL-Migrationen (per Supabase-CLI oder Dashboard-SQL-Editor anzuwenden)
docs/                     Hintergrund zu Schema (database-schema.md) und Auth-Flow (auth-flow.md)
DESIGN-DARKMODE.md        Design-System: Farb-Tokens, Paletten, Komponenten, Animationen
CHANGELOG.md              Automatisch bei jedem gemergten PR aktualisiert
SECURITY.md               Private Vulnerability Reporting (GitHub)
```
