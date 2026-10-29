# ISEF01-Geschenke-Manager

Projekt im Kurs ISEF01 – Projekt Software Engineering (IU Internationale Hochschule).
Thema E: Geschenke-Manager.

## Stack

- [Next.js](https://nextjs.org) (TypeScript, App Router) – Frontend + Backend
- [Tailwind CSS](https://tailwindcss.com) – Styling
- [Supabase](https://supabase.com) – Datenbank (PostgreSQL), Authentifizierung, Datei-Storage
- [Resend](https://resend.com) – E-Mail-Benachrichtigungen (Geburtstage, Weihnachten)
- [Vercel](https://vercel.com) – Hosting + Cron Jobs

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

## Projektstruktur

```
src/
  app/              Next.js App Router (Seiten, API-Routes)
  lib/supabase/     Supabase-Client (Browser + Server)
  middleware.ts     Hält die Auth-Session aktuell
```
