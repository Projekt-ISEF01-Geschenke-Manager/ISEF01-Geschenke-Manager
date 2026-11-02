# ISEF01-Geschenke-Manager (Giftwise)

Projekt im Kurs ISEF01 – Projekt Software Engineering (IU Internationale Hochschule).
Thema E: Geschenke-Manager.

Live: [gift-wise.de](https://gift-wise.de)

## Stand des Projekts

MVP (IM-4.1) ist größtenteils umgesetzt, Stufe 2 teilweise:

- ✅ **Fertig:** Registrierung/Login mit Rate-Limiting, Personen verwalten (Geburtstag,
  Interessen, Notizen), feste Anlässe (Geburtstag/Weihnachten), Geschenkideen mit
  Status offen/besorgt, Personenseite, Ideen per Link teilen, E-Mail-Bestätigung,
  Dark/Light-Mode, Übersichtsseite nach Wireframe
- ⚠️ **Teilweise:** Status "given"/Geschenk-Historie (Datenmodell da, noch keine UI);
  Idee → Geschenk umwandeln (bisher nur Status-Toggle, keine Anlass/Datum-Übernahme)
- ❌ **Offen:** Mailversand/Zeitplaner für Erinnerungen (A6/A7), Passwort-Reset,
  Admin-Account, Test-Accounts für den Tutor, eigene Anlässe, Bild-Upload,
  Aufgaben-Checkliste, Ideenvorschläge, HTML-Gesamtliste (alles Stufe 2/3)

135 automatisierte Vitest-Tests (`npm test`), CI (Lint + Build), Codacy und CodeQL
laufen auf jedem Pull Request. Noch kein Live-Test mit echtem Account durchgeführt.

## Stack

- [Next.js](https://nextjs.org) (TypeScript, App Router) – Frontend + Backend
- [Tailwind CSS](https://tailwindcss.com) – Styling
- [Supabase](https://supabase.com) – Datenbank (PostgreSQL), Authentifizierung
- [Resend](https://resend.com) – E-Mail-Versand (aktuell nur Bestätigungsmail;
  geplante Erinnerungen für Geburtstage/Weihnachten noch nicht umgesetzt)
- [Vercel](https://vercel.com) – Hosting (Cron Jobs für Erinnerungsmails geplant,
  noch nicht eingerichtet)

## Setup

1. Dependencies installieren:
   ```bash
   npm install
   ```
2. `.env.example` nach `.env.local` kopieren und Werte eintragen (Supabase-Projekt-URL/-Key aus dem Supabase-Dashboard, Resend-API-Key):
   ```bash
   cp .env.example .env.local
   ```
3. Dev-Server starten:
   ```bash
   npm run dev
   ```
   Läuft dann unter [http://localhost:3000](http://localhost:3000).
4. Tests ausführen:
   ```bash
   npm test
   ```

## Projektstruktur

```
src/
  app/              Next.js App Router (Seiten, Server Actions)
    actions/        Server Actions (auth, people, gifts, shared-links)
  components/       UI-Komponenten
  lib/supabase/     Supabase-Client (Browser + Server)
  proxy.ts          Next.js 16 Nachfolger von middleware.ts - hält die Auth-Session aktuell
supabase/
  migrations/       SQL-Migrationen (per Supabase-CLI anzuwenden)
docs/               Hintergrund zu Schema (database-schema.md) und Auth-Flow (auth-flow.md)
```
